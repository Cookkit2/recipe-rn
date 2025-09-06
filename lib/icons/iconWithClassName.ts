import type { ComponentType } from 'react';
import { cssInterop } from 'nativewind';

export function iconWithClassName(icon: ComponentType<any>) {
  cssInterop(icon, {
    className: {
      target: 'style',
      nativeStyleToProp: {
        color: true,
        opacity: true,
      },
    },
  });
}
