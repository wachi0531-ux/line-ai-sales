import { diagnosisContents } from '@/lib/diagnosis';
import { DiagnosisFormData, DiagnosisType } from '@/types/diagnosis';

type LineDeliveryResult = {
  status: 'sent' | 'skipped' | 'failed';
  message?: string;
};

const LINE_PUSH_ENDPOINT = 'https://api.line.me/v2/bot/message/push';

export function buildLineDiagnosisMessage(data: DiagnosisFormData, diagnosisType: DiagnosisType) {
  const content = diagnosisContents[diagnosisType];
  return [
    `${data.name}さん、AI活用無料診断の結果です。`,
    '',
    `診断タイプ：${content.title}`,
    `現在の課題：${content.issue}`,
    `おすすめ：${content.aiUsage}`,
    '',
    '次にやるべき3ステップ',
    ...content.steps.map((step, index) => `${index + 1}. ${step}`),
    '',
    '個別相談をご希望の場合は、このLINEに「相談希望」と返信してください。'
  ].join('\n');
}

export async function sendLineDiagnosisResult(data: DiagnosisFormData, diagnosisType: DiagnosisType): Promise<LineDeliveryResult> {
  if (!data.line_user_id) {
    return { status: 'skipped', message: 'LINEユーザーIDが未入力のため送信をスキップしました。' };
  }

  const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!channelAccessToken) {
    return { status: 'skipped', message: 'LINE_CHANNEL_ACCESS_TOKEN が未設定のため送信をスキップしました。' };
  }

  try {
    const response = await fetch(LINE_PUSH_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${channelAccessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: data.line_user_id,
        messages: [
          {
            type: 'text',
            text: buildLineDiagnosisMessage(data, diagnosisType)
          }
        ]
      })
    });

    if (!response.ok) {
      const responseText = await response.text();
      return { status: 'failed', message: responseText.slice(0, 500) || `LINE API error: ${response.status}` };
    }

    return { status: 'sent' };
  } catch (error) {
    return { status: 'failed', message: error instanceof Error ? error.message : 'LINE送信中に不明なエラーが発生しました。' };
  }
}
