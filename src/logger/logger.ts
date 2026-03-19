export class Logger {
  constructor(private readonly context: string) {}

  log(message: string): void {
    console.error(`[${this.context}] ${message}`);
  }
}
