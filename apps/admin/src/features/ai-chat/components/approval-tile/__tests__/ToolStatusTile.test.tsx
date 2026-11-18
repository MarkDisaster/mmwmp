import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { QueryWrapper } from '@/test/QueryWrapper';

import { ToolStatusTile } from '../ToolStatusTile';

const renderTile = (isDenied: boolean, input: unknown = { id: 3 }) =>
   render(<ToolStatusTile toolName="deleteFiles" input={input} isDenied={isDenied} />, {
      wrapper: QueryWrapper,
   });

describe('ToolStatusTile', () => {
   it('should say the call is processing once the user confirmed it', () => {
      renderTile(false);

      expect(screen.getByText(/Processing/)).toBeInTheDocument();
      expect(screen.queryByText(/Cancel/)).toBeNull();
   });

   it('should say the call was cancelled once the user denied it', () => {
      renderTile(true);

      expect(screen.getByText(/Cancel/)).toBeInTheDocument();
      expect(screen.queryByText(/Processing/)).toBeNull();
   });

   it('should list a bulk call in words with the sizes as the admin writes them', () => {
      renderTile(false, { files: [{ id: 1, name: 'a.pdf', sizeBytes: 1536 }] });

      expect(screen.getByText('(a.pdf (1.5 KB))')).toBeInTheDocument();
   });
});
