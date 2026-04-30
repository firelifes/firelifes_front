import { Provide } from '@midwayjs/core';
import { IRecord, ICreateRecordOptions, IUpdateRecordOptions } from '../interface';

@Provide()
export class RecordService {
  // 模拟数据库存储
  private records: Map<string, IRecord> = new Map();

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * 新增记账记录
   */
  async createRecord(options: ICreateRecordOptions): Promise<IRecord> {
    const record: IRecord = {
      id: this.generateId(),
      typeId: options.typeId,
      date: options.date,
      amount: options.amount,
      type: options.type,
      remark: options.remark,
    };
    this.records.set(record.id, record);
    return record;
  }

  /**
   * 更新记账记录
   */
  async updateRecord(options: IUpdateRecordOptions): Promise<IRecord | null> {
    const record = this.records.get(options.id);
    if (!record) {
      return null;
    }

    const updatedRecord: IRecord = {
      ...record,
      ...options,
    };
    this.records.set(options.id, updatedRecord);
    return updatedRecord;
  }

  /**
   * 根据ID获取记账记录
   */
  async getRecordById(id: string): Promise<IRecord | null> {
    return this.records.get(id) || null;
  }

  /**
   * 获取所有记账记录
   */
  async getAllRecords(): Promise<IRecord[]> {
    return Array.from(this.records.values());
  }

  /**
   * 删除记账记录
   */
  async deleteRecord(id: string): Promise<boolean> {
    return this.records.delete(id);
  }
}
