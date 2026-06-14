import { getRecipientsWithStats } from './actions';
import { AddRecipientForm } from '@/components/AddRecipientForm';
import { RecipientList } from '@/components/RecipientList';
import { connection } from 'next/server';

function getWeekDates() {
  const today = new Date();
  const day = today.getDay();
  const diff = today.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(today.setDate(diff));
  
  const week = [];
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    week.push({
      dateStr: d.toISOString().split('T')[0],
      dayName: dayNames[d.getDay()],
    });
  }
  return week;
}

export default async function Home() {
  await connection();

  const initialData = await getRecipientsWithStats('', null, 10);
  const weekDates = getWeekDates();
  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <main className="max-w-5xl w-full mx-auto px-6 sm:px-12 pt-32 pb-24 min-h-screen">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end border-b-2 border-black pb-8 mb-12 gap-6">
        <h1 className="text-4xl font-medium text-black tracking-tight">
          어르신 목록
        </h1>
        <div className="self-start sm:self-auto">
          <AddRecipientForm />
        </div>
      </header>

      <RecipientList 
        initialData={initialData} 
        weekDates={weekDates} 
        todayStr={todayStr} 
      />
    </main>
  );
}
