import { Provide } from '@midwayjs/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { Record } from '../entity/record.entity';
import { Account } from '../entity/account.entity';
import { Category } from '../entity/category.entity';

const NON_ESSENTIAL_KEYWORDS = [
  '娱乐', '游戏', '电影', 'KTV', '酒吧', '酒',
  '购物', '服饰', '服装', '美妆', '化妆', '奢侈品',
  '旅游', '旅行', '度假',
  '外卖', '咖啡', '奶茶', '零食', '甜品',
  '健身', '运动', '瑜伽',
  '美容', '美发', '美甲', '按摩', 'SPA',
  '会员', '订阅',
  '数码', '玩具', '盲盒',
];

const PASSIVE_INCOME_KEYWORDS = [
  '利息', '分红', '股息', '租金', '投资收益', '理财',
  '被动', '红利', '基金收益', '股票收益', '投资',
  '出租', '房租', '版税', '版权',
];

const ESSENTIAL_EXPENSE_KEYWORDS = [
  '房租', '水电', '物业', '燃气', '暖气', '网费', '话费',
  '餐饮', '正餐', '午餐', '晚餐', '早餐', '吃饭', '食材', ' groceries',
  '交通', '公交', '地铁', '打车', '加油', '汽油', '停车', '车票',
  '医疗', '看病', '医院', '药品', '药物',
  '教育', '学费', '培训', '课程', '书本', '教材',
  '保险', '社保',
  '日用', '日常', '生活',
];

export interface CashflowMonthTrendItem {
  month: string;
  freeCashflow: number;
  cashBalance: number;
}

export interface CashflowSummaryResponse {
  currentMonthFreeCashflow: number;
  totalCashBalance: number;
  monthlyTrend: CashflowMonthTrendItem[];
  savingsRate: number;
  passiveCashflowRatio: number;
  passiveCashflow: number;
  nonEssentialExpenseRatio: number;
  nonEssentialExpense: number;
  debtCoverage: number;
  survivalMonths: number;
  totalIncome: number;
  totalExpense: number;
  monthlyDebtRepayment: number;
  monthlyEssentialExpense: number;
}

@Provide()
export class CashflowService {
  @InjectEntityModel(Record)
  recordModel: Repository<Record>;

  @InjectEntityModel(Account)
  accountModel: Repository<Account>;

  @InjectEntityModel(Category)
  categoryModel: Repository<Category>;

  async getCashflowSummary(userId: number): Promise<CashflowSummaryResponse> {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // ===== 1. 获取当前现金余额（cash + investment 类型账户）=====
    const cashAccounts = await this.accountModel.find({
      where: { userId, isDeleted: false } as any,
    });

    const totalCashBalance = cashAccounts
      .filter((a) => a.type === 'cash' || a.type === 'investment')
      .reduce((sum, a) => sum + Number(a.balance || 0), 0);

    // ===== 2. 获取近6个月的记录用于计算趋势 =====
    const monthsToFetch = 6;
    const startDate = new Date(currentYear, currentMonth - monthsToFetch + 1, 1);
    const startDateStr = this.formatDate(startDate);
    const endDate = new Date(currentYear, currentMonth + 1, 0);
    const endDateStr = this.formatDate(endDate);

    const recentRecords = await this.recordModel
      .createQueryBuilder('r')
      .where('r.user_id = :userId', { userId })
      .andWhere('r.date BETWEEN :start AND :end', { start: startDateStr, end: endDateStr })
      .andWhere("r.type NOT IN ('adjustment_increase', 'adjustment_decrease')")
      .getMany();

    // 按月份分组
    const monthlyData = new Map<string, { income: number; expense: number; repayment: number }>();
    for (let i = monthsToFetch - 1; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyData.set(key, { income: 0, expense: 0, repayment: 0 });
    }

    recentRecords.forEach((r) => {
      const monthKey = r.date.substring(0, 7);
      const entry = monthlyData.get(monthKey);
      if (entry) {
        const amt = Number(r.amount || 0);
        if (r.type === 'income') entry.income += Math.abs(amt);
        else if (r.type === 'expense') entry.expense += Math.abs(amt);
        else if (r.type === 'repayment') entry.repayment += Math.abs(amt);
      }
    });

    // ===== 3. 计算自由现金流月度趋势和余额趋势 =====
    const monthlyTrend: CashflowMonthTrendItem[] = [];
    let runningBalance = totalCashBalance;

    const monthKeys = Array.from(monthlyData.keys()).sort();
    // 从最早的月份开始，逐月向前推算余额
    for (let i = monthKeys.length - 1; i >= 0; i--) {
      const key = monthKeys[i];
      const data = monthlyData.get(key)!;
      const freeCashflow = data.income - data.expense;
      monthlyTrend.unshift({
        month: key,
        freeCashflow: Number(freeCashflow.toFixed(2)),
        cashBalance: Number(runningBalance.toFixed(2)),
      });
      // 向前一个月：上个月的余额 = 当前月余额 - 当前月自由现金流
      runningBalance -= freeCashflow;
    }

    // ===== 4. 当前月汇总 =====
    const currentMonthKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    const currentMonthData = monthlyData.get(currentMonthKey) || { income: 0, expense: 0, repayment: 0 };
    const currentMonthFreeCashflow = Number((currentMonthData.income - currentMonthData.expense).toFixed(2));

    // ===== 5. 获取分类信息用于指标计算 =====
    const categories = await this.categoryModel.find();
    const categoryMap = new Map<string, { name: string; type: string }>();
    categories.forEach((c) => {
      categoryMap.set(String(c.id), { name: c.name, type: c.type });
    });

    // ===== 6. 当前月详细指标 =====
    let totalIncome = 0;
    let totalExpense = 0;
    let passiveIncome = 0;
    let nonEssentialExpense = 0;
    let essentialExpense = 0;
    let monthlyDebtRepayment = 0;

    const currentMonthStart = `${currentMonthKey}-01`;
    const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
    const currentMonthEnd = `${currentMonthKey}-${String(lastDay).padStart(2, '0')}`;

    const currentMonthRecords = recentRecords.filter((r) => r.date >= currentMonthStart && r.date <= currentMonthEnd);

    for (const r of currentMonthRecords) {
      const amt = Math.abs(Number(r.amount || 0));
      const category = r.typeId ? categoryMap.get(String(r.typeId)) : null;
      const categoryName = category?.name || '';

      if (r.type === 'income') {
        totalIncome += amt;
        if (PASSIVE_INCOME_KEYWORDS.some((kw) => categoryName.includes(kw))) {
          passiveIncome += amt;
        }
      } else if (r.type === 'expense') {
        totalExpense += amt;
        const isNonEssential = NON_ESSENTIAL_KEYWORDS.some((kw) => categoryName.includes(kw));
        const isEssential = ESSENTIAL_EXPENSE_KEYWORDS.some((kw) => categoryName.includes(kw));
        if (isNonEssential || !isEssential) {
          nonEssentialExpense += amt;
        }
        if (isEssential) {
          essentialExpense += amt;
        }
      } else if (r.type === 'repayment') {
        monthlyDebtRepayment += amt;
      }
    }

    // 如果没有必要支出分类，假设50%的支出为必要支出（作为fallback）
    if (essentialExpense === 0 && totalExpense > 0) {
      essentialExpense = totalExpense * 0.5;
      nonEssentialExpense = totalExpense * 0.5;
    }

    // ===== 7. 计算指标 =====
    const savingsRate = totalIncome > 0 ? Number(((totalIncome - totalExpense) / totalIncome * 100).toFixed(1)) : 0;
    const passiveCashflowRatio = totalIncome > 0 ? Number((passiveIncome / totalIncome * 100).toFixed(1)) : 0;
    const nonEssentialExpenseRatio = totalExpense > 0 ? Number((nonEssentialExpense / totalExpense * 100).toFixed(1)) : 0;
    const debtCoverage = monthlyDebtRepayment > 0
      ? Number((currentMonthFreeCashflow / monthlyDebtRepayment).toFixed(1))
      : 0;
    const survivalMonths = essentialExpense > 0
      ? Number((totalCashBalance / essentialExpense).toFixed(1))
      : 0;

    return {
      currentMonthFreeCashflow,
      totalCashBalance: Number(totalCashBalance.toFixed(2)),
      monthlyTrend,
      savingsRate,
      passiveCashflowRatio,
      passiveCashflow: Number(passiveIncome.toFixed(2)),
      nonEssentialExpenseRatio,
      nonEssentialExpense: Number(nonEssentialExpense.toFixed(2)),
      debtCoverage,
      survivalMonths,
      totalIncome: Number(totalIncome.toFixed(2)),
      totalExpense: Number(totalExpense.toFixed(2)),
      monthlyDebtRepayment: Number(monthlyDebtRepayment.toFixed(2)),
      monthlyEssentialExpense: Number(essentialExpense.toFixed(2)),
    };
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
