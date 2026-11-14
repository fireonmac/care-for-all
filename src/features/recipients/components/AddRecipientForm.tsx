'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RecipientNameDialog } from './RecipientNameDialog';

export function AddRecipientForm() {
  const [open, setOpen] = useState(false);
  return <RecipientNameDialog open={open} onOpenChange={setOpen}
    trigger={<Button type="button" variant="ghost" className="whitespace-nowrap px-2 sm:px-6 text-base sm:text-lg">+ 새 어르신 추가</Button>} />;
}
