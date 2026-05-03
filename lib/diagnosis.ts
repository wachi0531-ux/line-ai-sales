import { z } from 'zod';
import { FormData, DiagnosisType } from '@/types/diagnosis';

export const diagnosisSchema = z.object({
  name: z.string().min(1, '名前を入力してください'),
  email: z.string().email('メールアドレスの形式が正しくありません'),
  problem: z.enum(['集客', '売上', '作業時間', '顧客管理', 'SNS発信']),
  ai_experience: z.enum(['ある', '少しある', 'ない']),
  automation_interest: z.enum(['LINE配信', 'メール配信', 'SNS投稿', '顧客管理', '決済後の案内']),
  consultation_interest: z.enum(['ある', '少しある', '今は情報だけ欲しい'])
});

export const getDiagnosisType = (data: FormData): DiagnosisType => {
  if (data.problem === '集客' || data.problem === '売上' || data.automation_interest === 'SNS投稿') {
    return 'A';
  }
  if (data.problem === '作業時間' || data.automation_interest === 'メール配信') {
    return 'B';
  }
  return 'C';
};

export const diagnosisContents: Record<DiagnosisType, { title: string; issue: string; aiUsage: string; steps: string[] }> = {
  A: {
    title: 'A：集客導線改善タイプ',
    issue: '見込み客にサービスの価値がうまく伝わらず、導線が分かりづらい状態です。',
    aiUsage: 'AIでSNS投稿のアイデア作成とLP文章改善を行い、興味→登録までの流れを整えましょう。',
    steps: ['理想のお客様像を1つに絞る', 'SNS投稿テンプレートをAIで5本作る', 'LPのCTA文言をテストして改善する']
  },
  B: {
    title: 'B：業務効率化タイプ',
    issue: 'やることが多く、日々の運用に時間が取られて売上につながる行動が後回しです。',
    aiUsage: 'AIで定型文作成やメール下書きを自動化し、毎日の作業時間を減らしましょう。',
    steps: ['毎日繰り返す作業を3つ洗い出す', 'AIに任せるプロンプトを作成する', '1週間で削減できた時間を計測する']
  },
  C: {
    title: 'C：顧客管理・自動化タイプ',
    issue: '見込み客情報が散らばり、フォロー漏れが発生しやすい状態です。',
    aiUsage: '顧客情報を一元化し、登録後フォローを自動化して相談までスムーズにつなげましょう。',
    steps: ['顧客情報の入力項目を統一する', '登録後のフォローメッセージ流れを設計する', '相談希望者への案内を自動で送る導線を作る']
  }
};
