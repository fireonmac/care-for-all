import { getRecipientRecords, getRecipientOr404 } from '../queries';
import { RecordEditForm } from './RecordEditForm';
import { redirect } from 'next/navigation';

export default async function EditRecordPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const resolvedParams = await params;
  const resolvedSearch = await searchParams;
  
  if (!resolvedSearch.date) {
    redirect(`/recipients/${resolvedParams.id}`);
  }

  const recentRecords = await getRecipientRecords(resolvedParams.id);
  const targetRecord = recentRecords.find((r) => r.date === resolvedSearch.date && r.type === 'daily');

  if (!targetRecord) {
    redirect(`/recipients/${resolvedParams.id}?date=${resolvedSearch.date}`);
  }

  const recipient = await getRecipientOr404(resolvedParams.id);

  return <RecordEditForm record={targetRecord} recipientId={resolvedParams.id} recipientName={recipient.name} date={resolvedSearch.date} />;
}
