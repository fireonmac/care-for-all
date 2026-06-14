'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { getRecipientsWithStats } from '@/app/actions';
import Link from 'next/link';
import { Check, Search, Loader2 } from 'lucide-react';
import { commonInputClasses } from '@/components/Textarea';

type RecipientWithStats = Awaited<ReturnType<typeof getRecipientsWithStats>>['data'][number];

export function RecipientList({ 
  initialData, 
  weekDates, 
  todayStr 
}: { 
  initialData: { data: RecipientWithStats[], nextCursor: string | null },
  weekDates: { dateStr: string, dayName: string }[], 
  todayStr: string 
}) {
  const [recipients, setRecipients] = useState(initialData.data);
  const [nextCursor, setNextCursor] = useState(initialData.nextCursor);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [isTyping, setIsTyping] = useState(false);
  const prevSearchQuery = useRef(searchQuery);
  const observerTarget = useRef<HTMLDivElement>(null);

  // 검색어 변경 시 데이터 리로드
  useEffect(() => {
    if (prevSearchQuery.current === searchQuery) {
      return;
    }
    prevSearchQuery.current = searchQuery;
    
    setIsTyping(true);
    const timer = setTimeout(async () => {
      const res = await getRecipientsWithStats(searchQuery, null, 10);
      setRecipients(res.data);
      setNextCursor(res.nextCursor);
      setIsTyping(false);
    }, 300); // 디바운스
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 무한 스크롤 로드
  const loadMore = useCallback(async () => {
    if (loading || !nextCursor) return;
    setLoading(true);
    const res = await getRecipientsWithStats(searchQuery, nextCursor, 10);
    setRecipients(prev => {
      // 중복 방지 (커서 기반이므로 기본적으로 없지만 혹시 모를 안전장치)
      const newItems = res.data.filter(newItem => !prev.some(p => p.id === newItem.id));
      return [...prev, ...newItems];
    });
    setNextCursor(res.nextCursor);
    setLoading(false);
  }, [loading, nextCursor, searchQuery]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [loadMore]);

  return (
    <div className="flex flex-col">
      <div className="relative mb-12">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          {isTyping ? (
            <Loader2 className="h-5 w-5 text-surface-500 animate-spin" />
          ) : (
            <Search className="h-5 w-5 text-surface-500" />
          )}
        </div>
        <input
          type="text"
          placeholder="어르신 성함 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={`sm:w-80 px-4 py-3 pl-12 text-lg ${commonInputClasses}`}
        />
      </div>

      <div className="flex flex-col gap-6">
        {recipients.length === 0 && !loading ? (
          <div className="py-24 flex flex-col items-center justify-center text-center">
            <p className="text-2xl font-light mb-4 text-surface-900 tracking-tight">검색된 어르신이 없습니다.</p>
          </div>
        ) : (
          recipients.map((r) => (
            <Link 
              key={r.id} 
              href={`/recipients/${r.id}`}
              className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-8 border-b border-surface-200 group gap-6"
            >
              <div className="flex flex-col gap-3">
                <span className="text-3xl font-medium tracking-tight text-black">
                  {r.name} <span className="text-2xl font-normal ml-1 text-surface-700">어르신</span>
                </span>
                <span className="text-surface-500 font-normal text-base tracking-wide">
                  최근 작성일: {r.latestRecordDate ? r.latestRecordDate : '-'}
                </span>
              </div>
              <div className="self-start sm:self-auto mt-4 sm:mt-0 flex gap-4">
                {weekDates.map((d) => {
                  const hasRecord = r.weeklyRecords.includes(d.dateStr);
                  const isFuture = d.dateStr > todayStr;
                  return (
                    <div key={d.dateStr} className={`flex flex-col items-center justify-center gap-1.5 ${(isFuture || d.dayName === '일') ? 'opacity-30' : ''}`}>
                      <span className={`text-[11px] tracking-widest ${
                        d.dateStr === todayStr 
                          ? 'text-black font-semibold' 
                          : d.dayName === '일' 
                            ? 'text-surface-700 font-medium' 
                            : 'text-black font-medium'
                      }`}>
                        {d.dayName}
                      </span>
                      <div className="h-4 flex items-center justify-center">
                        {hasRecord ? (
                          <Check size={14} strokeWidth={4} className="text-status-success" />
                        ) : d.dayName === '일' ? null : !isFuture ? (
                          <div className="w-1.5 h-1.5 rounded-full bg-status-danger"></div>
                        ) : (
                          <div className="w-1.5 h-1.5 rounded-full bg-surface-500"></div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Link>
          ))
        )}
        
        {/* Infinite Scroll Trigger */}
        <div ref={observerTarget} className="h-10 w-full flex items-center justify-center">
          {loading && <span className="text-surface-400 text-sm tracking-widest font-light">불러오는 중...</span>}
        </div>
      </div>
    </div>
  );
}
