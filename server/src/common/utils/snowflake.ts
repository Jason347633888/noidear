export class Snowflake {
  private sequence = 0;
  private lastTimestamp = 0n;
  private readonly workerId: number;
  private readonly datacenterId: number;

  constructor(workerId: number = 1, datacenterId: number = 1) {
    this.workerId = workerId;
    this.datacenterId = datacenterId;
  }

  nextId(): string {
    const timestamp = BigInt(Date.now());
    if (timestamp === this.lastTimestamp) {
      this.sequence = (this.sequence + 1) & 4095;
    } else {
      this.sequence = 0;
    }
    this.lastTimestamp = timestamp;
    const id = ((timestamp - 1609459200000n) << 22n) |
               (BigInt(this.datacenterId) << 17n) |
               (BigInt(this.workerId) << 12n) |
               BigInt(this.sequence);
    return id.toString();
  }
}
