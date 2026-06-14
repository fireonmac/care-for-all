import { AddRecipientForm } from '@/components/AddRecipientForm';
import { RecipientList } from '@/components/RecipientList';
import { getRecipientsPage } from '@/features/recipients/queries';
import { getWeekData, getKSTDateStr } from '@/lib/dateUtils';
import { connection } from 'next/server';

export default async function Home() {
  await connection();

  const todayStr = getKSTDateStr(new Date());
  const { weekDates } = getWeekData(todayStr);
  const recipientsListData = await getRecipientsPage();

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
        recipientsListData={recipientsListData}
        weekDates={weekDates}
        todayStr={todayStr}
      />
    </main>
  );
}
