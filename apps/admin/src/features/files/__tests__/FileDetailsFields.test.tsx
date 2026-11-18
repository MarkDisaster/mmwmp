import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import uploadFileBodyDto from '@/api/generated/schemas/uploadFileBodyDto.json';

import { FileDetailsFields } from '../components/upload-dialog/FileDetailsFields';

describe('FileDetailsFields', () => {
   it('should limit the name to the length POST /files accepts', () => {
      render(
         <FileDetailsFields
            file={new File(['x'], 'report.pdf', { type: 'application/pdf' })}
            displayName="report"
            onDisplayNameChange={vi.fn()}
            language={null}
            onLanguageChange={vi.fn()}
         />,
      );

      expect(screen.getByLabelText('File name')).toHaveAttribute(
         'maxLength',
         String(uploadFileBodyDto.properties.displayName.maxLength),
      );
   });
});
