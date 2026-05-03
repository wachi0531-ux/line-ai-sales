export type DiagnosisType = 'A' | 'B' | 'C';

export type FormData = {
  name: string;
  email: string;
  problem: '集客' | '売上' | '作業時間' | '顧客管理' | 'SNS発信';
  ai_experience: 'ある' | '少しある' | 'ない';
  automation_interest: 'LINE配信' | 'メール配信' | 'SNS投稿' | '顧客管理' | '決済後の案内';
  consultation_interest: 'ある' | '少しある' | '今は情報だけ欲しい';
};
