'use client';

import { useState } from 'react';
import { saveDailyRecord } from './actions';
import { useRouter } from 'next/navigation';
import { Textarea, commonInputClasses } from '@/components/Textarea';
import { Loader2 } from 'lucide-react';

type EventInput = {
  id: string;
  event: string;
  emotion: string;
  isCustomEmotion: boolean;
  action: string;
};

const PREDEFINED_EMOTIONS = [
  { id: 'happy', icon: '🥰', label: '편안/기분좋음', text: '편안하고 기분 좋은 상태이심' },
  { id: 'neutral', icon: '😌', label: '차분함', text: '특별한 감정 동요 없이 차분하심' },
  { id: 'anxious', icon: '😰', label: '우울/불안', text: '우울해하거나 불안해하심' },
  { id: 'angry', icon: '😡', label: '거부/화남', text: '거부 반응을 보이거나 화를 내심' },
];

export function KeywordInputForm({ recipientId, targetDate, recipientName }: { recipientId: string, targetDate: string, recipientName: string }) {
  const [events, setEvents] = useState<EventInput[]>([{ id: Math.random().toString(), event: '', emotion: '', isCustomEmotion: false, action: '' }]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<{cognition: string; behavior: string} | null>(null);
  const router = useRouter();
  
  const todayStr = new Date().toISOString().split('T')[0];
  const isFuture = targetDate > todayStr;
  
  const addEvent = () => {
    const newId = Math.random().toString();
    setEvents([...events, { id: newId, event: '', emotion: '', isCustomEmotion: false, action: '' }]);
    setTimeout(() => {
      document.getElementById(`event-input-${newId}`)?.focus();
    }, 10);
  };

  const removeEvent = (id: string) => {
    setEvents(events.filter(e => e.id !== id));
  };

  const updateEvent = (id: string, fields: Partial<EventInput>) => {
    setEvents(prev => prev.map(e => e.id === id ? { ...e, ...fields } : e));
  };
  
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validEvents = events.filter(ev => ev.event.trim() || ev.emotion.trim() || ev.action.trim());
    if (validEvents.length === 0 || loading) return;
    
    const keywords = validEvents.map((ev, index) => {
      let text = `[사건 ${index + 1}]`;
      if (ev.event.trim()) text += `\n- 일어난 사건: ${ev.event.trim()}`;
      if (ev.emotion.trim()) text += `\n- 어르신의 감정 및 반응: ${ev.emotion.trim()}`;
      if (ev.action.trim()) text += `\n- 요양보호사의 조치: ${ev.action.trim()}`;
      return text;
    }).join('\n\n');
    
    setLoading(true);
    // 즉시 리뷰 화면으로 전환
    setDraft({ cognition: '', behavior: '' });
    
    try {
      const res = await fetch('/api/generate-daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords })
      });

      if (!res.ok) {
        throw new Error(`Generation failed: ${res.status}`);
      }
      if (!res.body) throw new Error('No body');
      
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      
      let fullText = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        fullText += decoder.decode(value, { stream: true });

        let currentCognition = '';
        let currentBehavior = '';

        if (fullText.includes('[행동]')) {
          const [cognition, behavior = ''] = fullText.split('[행동]', 2);
          currentCognition = cognition.replace('[인지]', '').trim();
          currentBehavior = behavior.trim();
        } else {
          currentCognition = fullText.replace('[인지]', '').trim();
        }

        setDraft({ cognition: currentCognition, behavior: currentBehavior });
      }
    } catch {
      alert('생성 중 오류가 발생했습니다.');
      setDraft(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true);
    await saveDailyRecord(recipientId, draft.cognition, draft.behavior, targetDate);
    setSaving(false);
    router.refresh();
  };

  if (draft) {
    return (
      <div>
        <div className="mb-8 flex items-center gap-4">
          <h2 className="text-3xl font-medium text-black tracking-tight">생성된 기록 검토</h2>
          {loading && <Loader2 className="h-6 w-6 text-surface-400 animate-spin" />}
        </div>
        
        <div className="flex flex-col gap-16 mb-16">
          <div className="flex flex-col relative">
            <h3 className="text-base font-medium text-black tracking-widest mb-6">인지 영역</h3>
            <Textarea
              className={`text-xl pb-12 min-h-[200px] transition-all duration-500 ${loading && !draft.cognition ? 'bg-surface-200 animate-pulse border-transparent text-surface-700' : ''}`}
              value={draft.cognition}
              placeholder={loading && !draft.cognition ? 'AI가 문맥을 파악하고 작성을 준비하고 있습니다...' : ''}
              readOnly={loading}
              maxLength={1000}
              onChange={(e) => setDraft({...draft, cognition: e.target.value})}
            />
            <span className="absolute bottom-4 right-6 text-sm text-surface-500 font-light tracking-widest">
              {draft.cognition.length}/1000
            </span>
          </div>
          
          <div className="flex flex-col relative">
            <h3 className="text-base font-medium text-black tracking-widest mb-6">행동 영역</h3>
            <Textarea
              className={`text-xl pb-12 min-h-[200px] transition-all duration-500 ${loading && !draft.behavior ? 'bg-surface-200 animate-pulse border-transparent text-surface-700' : ''}`}
              value={draft.behavior}
              placeholder={loading && !draft.behavior && draft.cognition ? '인지 영역 완료. 행동 영역 작성을 준비합니다...' : loading && !draft.behavior ? 'AI가 문맥을 파악하고 작성을 준비하고 있습니다...' : ''}
              readOnly={loading}
              maxLength={1000}
              onChange={(e) => setDraft({...draft, behavior: e.target.value})}
            />
            <span className="absolute bottom-4 right-6 text-sm text-surface-500 font-light tracking-widest">
              {draft.behavior.length}/1000
            </span>
          </div>
        </div>

        <div className="flex justify-end gap-6 border-t border-surface-200 pt-8">
          <button
            onClick={() => setDraft(null)}
            disabled={loading}
            className="text-base font-medium tracking-widest text-surface-600 hover:text-black disabled:opacity-30"
          >
            다시 쓰기
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="px-10 py-4 bg-black text-white text-base font-medium tracking-widest rounded-lg hover:bg-surface-800 disabled:opacity-50"
          >
            {saving ? '저장 중...' : '최종 저장'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-3xl font-medium text-black tracking-tight">관찰 내용 입력</h2>
      </div>
      <p className="text-surface-600 mb-12 text-xl font-medium leading-relaxed">
        일어난 사건과 어르신의 감정, 그리고 선생님의 조치를 나누어 적어주세요. <br /> 
        시스템이 이를 분석하여 훨씬 더 풍부하고 전문적인 일지로 바꾸어줍니다.
      </p>
      
      <form onSubmit={handleGenerate} className="flex flex-col gap-8">
        {events.map((e, i) => {
          const isEventEmpty = !e.event.trim();
          
          return (
          <div key={e.id} className="relative bg-white p-8 md:p-10 rounded-3xl border-2 border-surface-300 flex flex-col gap-8 mb-4">
            <div className="flex items-center justify-between pb-2">
              <span className="text-base font-medium text-black tracking-widest">사건 {i + 1}</span>
              {events.length > 1 && (
                <button 
                  type="button" 
                  onClick={() => removeEvent(e.id)}
                  className="text-surface-500 hover:text-status-danger text-sm tracking-widest font-medium transition-colors"
                >
                  삭제
                </button>
              )}
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-base tracking-widest text-black flex items-baseline">
                일어난 사건 <span className="text-sm text-surface-600 font-normal ml-2">(필수)</span>
              </label>
              <input
                id={`event-input-${e.id}`}
                type="text"
                value={e.event}
                onChange={(ev) => updateEvent(e.id, { event: ev.target.value })}
                disabled={isFuture}
                placeholder="어떤 일이 있었나요? (예: 식사 중 숟가락을 떨어뜨리심)"
                className={`px-5 py-3.5 text-lg font-normal ${commonInputClasses}`}
              />
            </div>

            <div className={`flex flex-col gap-3 transition-opacity duration-300 ${isEventEmpty ? 'opacity-40' : 'opacity-100'}`}>
              <label className="text-base tracking-widest text-black flex items-baseline">
                어르신의 감정 및 반응 <span className="text-sm text-surface-500 font-normal ml-2">(선택)</span>
              </label>
              <div className="flex flex-wrap gap-2 mt-1">
                {PREDEFINED_EMOTIONS.map(emo => (
                  <button
                    key={emo.id}
                    type="button"
                    onClick={() => updateEvent(e.id, { emotion: emo.text, isCustomEmotion: false })}
                    disabled={isFuture || isEventEmpty}
                    className={`px-5 py-2.5 rounded-full text-base font-medium transition-all disabled:cursor-not-allowed ${
                      !e.isCustomEmotion && e.emotion === emo.text 
                        ? 'bg-white border-2 border-black text-black' 
                        : 'bg-white border-2 border-surface-200 text-surface-500 hover:border-surface-400 hover:text-surface-700'
                    }`}
                  >
                    {emo.icon} {emo.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => updateEvent(e.id, { isCustomEmotion: true, emotion: '' })}
                  disabled={isFuture || isEventEmpty}
                  className={`px-5 py-2.5 rounded-full text-base font-medium transition-all disabled:cursor-not-allowed ${
                    e.isCustomEmotion 
                      ? 'bg-white border-2 border-black text-black' 
                      : 'bg-white border-2 border-surface-200 text-surface-500 hover:border-surface-400 hover:text-surface-700'
                  }`}
                >
                  ✏️ 직접 입력
                </button>
              </div>
              {e.isCustomEmotion && (
                <input
                  type="text"
                  value={e.emotion}
                  onChange={(ev) => updateEvent(e.id, { emotion: ev.target.value })}
                  disabled={isFuture || isEventEmpty}
                  placeholder="직접 감정이나 반응을 입력해주세요"
                  className={`mt-2 px-5 py-3.5 text-lg font-normal ${commonInputClasses}`}
                />
              )}
            </div>

            <div className={`flex flex-col gap-2 transition-opacity duration-300 ${isEventEmpty ? 'opacity-40' : 'opacity-100'}`}>
              <label className="text-base tracking-widest text-black flex items-baseline">
                요양보호사의 조치 <span className="text-sm text-surface-500 font-normal ml-2">(선택)</span>
              </label>
              <input
                type="text"
                value={e.action}
                onChange={(ev) => updateEvent(e.id, { action: ev.target.value })}
                disabled={isFuture || isEventEmpty}
                placeholder="어떻게 대처하셨나요? (예: 안심시켜드리고 새 숟가락 교체)"
                className={`px-5 py-3.5 text-lg font-normal ${commonInputClasses}`}
              />
            </div>
          </div>
        );
      })}
        
        <div className="flex flex-col mb-8 mt-2">
          <button
            type="button"
            onClick={addEvent}
            disabled={isFuture}
            className="w-full py-5 border-2 border-dashed border-surface-300 hover:border-black hover:bg-surface-50 text-surface-500 hover:text-black rounded-3xl flex items-center justify-center gap-2 text-base font-medium tracking-widest transition-all disabled:opacity-30 disabled:hover:border-surface-300 disabled:hover:bg-transparent disabled:cursor-not-allowed"
          >
            <span className="text-2xl font-light mb-0.5">+</span> 새로운 사건 추가
          </button>
        </div>
        
        <div className="flex justify-end mt-4">
          <button
            type="submit"
            disabled={loading || events.every(ev => !ev.event.trim() && !ev.emotion.trim() && !ev.action.trim()) || isFuture}
            className="px-10 py-4 bg-black text-white text-base font-medium tracking-widest rounded-lg hover:bg-surface-800 disabled:opacity-30"
          >
            {loading ? '생성 중...' : '기록 초안 생성'}
          </button>
        </div>
      </form>
    </div>
  );
}
