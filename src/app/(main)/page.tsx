import { AddRecipientForm } from '@/features/recipients/components/AddRecipientForm';
import { RecipientList } from '@/features/recipients/components/RecipientList';
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
      <header className="flex items-center sm:items-end justify-between border-b-2 border-primary pb-8 mb-12 gap-2 sm:gap-6">
        <h1 className="text-2xl sm:text-4xl font-medium text-foreground tracking-tight whitespace-nowrap">
          어르신 목록
        </h1>
        <div className="shrink-0">
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
