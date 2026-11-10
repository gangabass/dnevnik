export interface Device {
  id: string; owner_hash: string; endpoint_hash: string; token_cipher: string | null;
  subscription_cipher: string; person_id: string; school_id: string; student_name: string;
  generation: string; state: string; created_at: number; updated_at: number;
  next_check_at: number; last_check_at: number | null; last_success_at: number | null;
  last_push_at: number | null; last_error: string | null; failure_count: number;
  lease_until: number; lease_owner: string; test_at: number;
}
export interface Outbox { id: string; device_id: string; generation: string; event_key: string; payload_cipher: string; created_at: number; next_attempt: number; attempts: number }
export interface Seen { mark_id: string; value_hash: string }
export class PushStore {
  constructor(public db: D1Database) {}
  get(id: string) { return this.db.prepare('SELECT * FROM push_devices WHERE id=?').bind(id).first<Device>(); }
  endpointOwner(hash: string) { return this.db.prepare('SELECT id FROM push_devices WHERE endpoint_hash=?').bind(hash).first<{ id: string }>(); }
  async save(device: Device, baseline: Seen[] | null) {
    const statements = [this.db.prepare(`INSERT INTO push_devices
      (id,owner_hash,endpoint_hash,token_cipher,subscription_cipher,person_id,school_id,student_name,generation,state,created_at,updated_at,next_check_at)
      VALUES (?,?,?,?,?,?,?,?,?,'active',?,?,0)
      ON CONFLICT(id) DO UPDATE SET endpoint_hash=excluded.endpoint_hash,token_cipher=excluded.token_cipher,
      subscription_cipher=excluded.subscription_cipher,person_id=excluded.person_id,school_id=excluded.school_id,
      student_name=excluded.student_name,generation=excluded.generation,state='active',updated_at=excluded.updated_at,
      next_check_at=0,last_error=NULL,failure_count=0,lease_until=0,lease_owner=''
      WHERE push_devices.owner_hash=excluded.owner_hash`).bind(device.id,device.owner_hash,device.endpoint_hash,device.token_cipher,device.subscription_cipher,device.person_id,device.school_id,device.student_name,device.generation,device.created_at,device.updated_at)];
    if (baseline !== null) {
      statements.push(this.db.prepare('DELETE FROM push_seen WHERE device_id=? AND EXISTS(SELECT 1 FROM push_devices WHERE id=? AND generation=?)').bind(device.id, device.id, device.generation));
      statements.push(this.db.prepare('DELETE FROM push_outbox WHERE device_id=? AND EXISTS(SELECT 1 FROM push_devices WHERE id=? AND generation=?)').bind(device.id, device.id, device.generation));
      for (const seen of baseline) statements.push(this.db.prepare('INSERT INTO push_seen(device_id,mark_id,value_hash) SELECT ?,?,? WHERE EXISTS(SELECT 1 FROM push_devices WHERE id=? AND generation=?)').bind(device.id, seen.mark_id, seen.value_hash, device.id, device.generation));
    }
    // D1 batch is transactional: the baseline and credentials change together.
    await this.db.batch(statements);
  }
  async pending(id: string) { return (await this.db.prepare('SELECT COUNT(*) AS total FROM push_outbox WHERE device_id=?').bind(id).first<{total:number}>())?.total || 0; }
  async remove(id: string, ownerHash: string) { await this.db.prepare('DELETE FROM push_devices WHERE id=? AND owner_hash=?').bind(id, ownerHash).run(); }
  async due(now: number) {
    const result = await this.db.prepare(`SELECT d.* FROM push_devices d WHERE lease_until<=? AND
      ((state='active' AND next_check_at<=?) OR EXISTS(SELECT 1 FROM push_outbox q WHERE q.device_id=d.id AND q.next_attempt<=?))
      ORDER BY COALESCE(last_check_at,0),next_check_at LIMIT 25`).bind(now,now,now).all<Device>();
    return result.results;
  }
  claim(id: string, owner: string, now: number) {
    return this.db.prepare('UPDATE push_devices SET lease_owner=?,lease_until=? WHERE id=? AND lease_until<=? RETURNING *').bind(owner, now+240000,id,now).first<Device>();
  }
  async release(device: Device) { await this.db.prepare("UPDATE push_devices SET lease_until=0,lease_owner='' WHERE id=? AND lease_owner=?").bind(device.id,device.lease_owner).run(); }
  async seen(id: string) { return (await this.db.prepare('SELECT mark_id,value_hash FROM push_seen WHERE device_id=?').bind(id).all<Seen>()).results; }
  guard(device: Device) { return this.db.prepare('SELECT id FROM push_devices WHERE id=? AND generation=? AND lease_owner=?').bind(device.id,device.generation,device.lease_owner).first(); }
  async record(device: Device, seen: Seen[], events: Outbox[], now: number) {
    const statements: D1PreparedStatement[] = [];
    for (const item of seen) statements.push(this.db.prepare(`INSERT INTO push_seen(device_id,mark_id,value_hash) SELECT ?,?,? WHERE EXISTS(SELECT 1 FROM push_devices WHERE id=? AND generation=? AND lease_owner=?) ON CONFLICT(device_id,mark_id) DO UPDATE SET value_hash=excluded.value_hash`).bind(device.id,item.mark_id,item.value_hash,device.id,device.generation,device.lease_owner));
    for (const item of events) statements.push(this.insertEvent(device, item));
    statements.push(this.db.prepare("UPDATE push_devices SET last_check_at=?,last_success_at=?,next_check_at=?,last_error=CASE WHEN last_error IN ('PUSH_RETRY','PUSH_AUTH_FAILED','SUBSCRIPTION_DECRYPTION_FAILED') THEN last_error ELSE NULL END,failure_count=0 WHERE id=? AND generation=? AND lease_owner=?").bind(now,now,Math.floor(now/300000)*300000+300000,device.id,device.generation,device.lease_owner));
    await this.db.batch(statements);
  }
  insertEvent(device: Device, item: Outbox) {
    return this.db.prepare(`INSERT OR IGNORE INTO push_outbox(id,device_id,generation,event_key,payload_cipher,created_at,next_attempt)
      SELECT ?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM push_devices WHERE id=? AND generation=? AND lease_owner=?)`).bind(item.id,device.id,device.generation,item.event_key,item.payload_cipher,item.created_at,item.next_attempt,device.id,device.generation,device.lease_owner);
  }
  async pause(device: Device, state: string, event: Outbox, now: number) {
    await this.db.batch([this.insertEvent(device,event),this.db.prepare('UPDATE push_devices SET state=?,token_cipher=NULL,last_error=?,last_check_at=? WHERE id=? AND generation=? AND lease_owner=?').bind(state,state,now,device.id,device.generation,device.lease_owner)]);
  }
  async failed(device: Device, code: string, now: number) {
    const delay = Math.min(3600000,300000 * 2 ** Math.min(device.failure_count,4));
    await this.db.prepare('UPDATE push_devices SET last_check_at=?,last_error=?,failure_count=failure_count+1,next_check_at=? WHERE id=? AND generation=? AND lease_owner=?').bind(now,code,now+delay,device.id,device.generation,device.lease_owner).run();
  }
  async queue(device: Device, now: number) {
    return (await this.db.prepare('SELECT * FROM push_outbox WHERE device_id=? AND generation=? AND next_attempt<=? ORDER BY created_at LIMIT 5').bind(device.id,device.generation,now).all<Outbox>()).results;
  }
  async sent(device: Device, event: Outbox, now: number) {
    await this.db.batch([
      this.db.prepare('DELETE FROM push_outbox WHERE id=? AND EXISTS(SELECT 1 FROM push_devices WHERE id=? AND generation=? AND lease_owner=?)').bind(event.id,device.id,device.generation,device.lease_owner),
      this.db.prepare("UPDATE push_devices SET last_push_at=?,last_error=CASE WHEN last_error IN ('PUSH_RETRY','PUSH_AUTH_FAILED') THEN NULL ELSE last_error END WHERE id=? AND generation=? AND lease_owner=?").bind(now,device.id,device.generation,device.lease_owner),
    ]);
  }
  async retry(device: Device, event: Outbox, code: string, now: number, retryAfter = 0) {
    const delay = Math.max(retryAfter,Math.min(21600000,300000*2**Math.min(event.attempts,7)));
    await this.db.batch([
      this.db.prepare('UPDATE push_outbox SET attempts=attempts+1,next_attempt=? WHERE id=? AND EXISTS(SELECT 1 FROM push_devices WHERE id=? AND generation=? AND lease_owner=?)').bind(now+delay,event.id,device.id,device.generation,device.lease_owner),
      this.db.prepare('UPDATE push_devices SET last_error=? WHERE id=? AND generation=? AND lease_owner=?').bind(code,device.id,device.generation,device.lease_owner),
    ]);
  }
  async expired(device: Device) { await this.db.prepare('DELETE FROM push_devices WHERE id=? AND generation=? AND lease_owner=?').bind(device.id,device.generation,device.lease_owner).run(); }
  testLease(id: string, hash: string, now: number) { return this.db.prepare('UPDATE push_devices SET test_at=? WHERE id=? AND owner_hash=? AND test_at<=? RETURNING id').bind(now,id,hash,now-60000).first(); }
}
