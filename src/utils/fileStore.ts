import * as fs from "fs";
import * as path from "path";

export class FileStore<T> {
  private filePath: string;
  private data: { [key: string]: T };

  constructor(filePath: string) {
    this.filePath = filePath;
    this.data = {};
    this.load();
  }

  private load() {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      if (!fs.existsSync(this.filePath)) {
        fs.writeFileSync(this.filePath, JSON.stringify({}, null, 2));
        this.data = {};
      } else {
        const fileContent = fs.readFileSync(this.filePath, "utf-8");
        this.data = JSON.parse(fileContent || "{}");
      }
    } catch (error) {
      console.error("Error loading store:", error);
      this.data = {};
    }
  }

  save() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
    } catch (error) {
      console.error("Error saving store:", error);
    }
  }

  set(key: string, value: T) {
    this.data[key] = value;
    this.save();
  }

  get(key: string) {
    return this.data[key];
  }

  has(key: string) {
    return Object.prototype.hasOwnProperty.call(this.data, key);
  }

  delete(key: string) {
    if (this.data[key]) {
      delete this.data[key];
      this.save();
    }
  }
}
