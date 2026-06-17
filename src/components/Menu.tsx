'use client';

import { Menu as BaseMenu } from '@base-ui/react';
import * as React from 'react';

const Content = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof BaseMenu.Positioner> & { className?: string }>(
  ({ className = '', children, side = 'bottom', align = 'end', sideOffset = 8, ...props }, ref) => (
    <BaseMenu.Portal>
      <BaseMenu.Positioner side={side} align={align} sideOffset={sideOffset} {...props}>
        <BaseMenu.Popup ref={ref} className={`bg-white border border-surface-200 rounded-xl shadow-lg py-2 min-w-48 z-50 outline-none flex flex-col ${className}`}>
          {children}
        </BaseMenu.Popup>
      </BaseMenu.Positioner>
    </BaseMenu.Portal>
  )
);
Content.displayName = 'Menu.Content';

const Item = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof BaseMenu.Item>>(
  ({ className = '', ...props }, ref) => (
    <BaseMenu.Item 
      ref={ref}
      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium hover:bg-surface-50 cursor-pointer outline-none transition-colors text-black ${className}`}
      {...props}
    />
  )
);
Item.displayName = 'Menu.Item';

const Separator = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className = '', ...props }, ref) => (
    <div ref={ref} className={`border-b border-surface-100 my-1 ${className}`} {...props} />
  )
);
Separator.displayName = 'Menu.Separator';

const Label = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className = '', ...props }, ref) => (
    <div ref={ref} className={`px-4 py-2 ${className}`} {...props} />
  )
);
Label.displayName = 'Menu.Label';

export const Menu = {
  Root: BaseMenu.Root,
  Trigger: BaseMenu.Trigger,
  Content,
  Item,
  Separator,
  Label,
};
