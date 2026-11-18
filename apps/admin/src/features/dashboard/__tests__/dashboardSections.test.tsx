import { render, screen, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { api } from '@/api';
import type { RunnerScoreEntity } from '@/api/generated';
import { signInAs } from '@/test/auth';
import { ADMIN_ROLE, createRole, createUser } from '@/test/fixtures';
import { QueryWrapper } from '@/test/QueryWrapper';
import { queryClient } from '@/utils/query-client';

import { AuroraStatsSection } from '../components/AuroraStatsSection';
import { GameStatsSection } from '../components/GameStatsSection';

const HIDDEN_ON_PHONE = 'max-sm:hidden';
const READ_SCORES = 'runner_scores.read';
const TOP_KEY = () =>
   api.runnerScores.queries.all({ limit: 10, sortBy: 'score', sortOrder: 'desc' }).queryKey;
const toRuns = (
   players: { nick: string; score: number; seconds?: number; hidden?: boolean }[],
): RunnerScoreEntity[] =>
   players.map((player, index) => ({
      id: index + 1,
      hidden: false,
      createdAt: '2020-01-01T00:00:00.000Z',
      ...player,
   })) as RunnerScoreEntity[];
const renderSection = (ui: ReactElement) => render(<QueryWrapper>{ui}</QueryWrapper>);

afterEach(() => {
   queryClient.clear();
   vi.restoreAllMocks();
});

describe('AuroraStatsSection', () => {
   it('should show the two cards with their explanation, without latency and cost', () => {
      signInAs(createUser(ADMIN_ROLE));
      renderSection(<AuroraStatsSection />);

      expect(screen.getByText('AURORA today')).toBeInTheDocument();
      expect(screen.getByText('Questions')).toBeInTheDocument();
      expect(screen.getByText('Errors')).toBeInTheDocument();
      expect(screen.getByRole('img', { name: 'Questions' })).toBeInTheDocument();
      expect(screen.getByRole('img', { name: 'Errors' })).toBeInTheDocument();
      expect(screen.queryByText(/latency/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/cost/i)).not.toBeInTheDocument();
   });

   it('should render nothing for a non-admin', () => {
      signInAs(createUser(createRole([READ_SCORES])));
      const { container } = renderSection(<AuroraStatsSection />);

      expect(container).toBeEmptyDOMElement();
   });
});

describe('GameStatsSection', () => {
   it('should render nothing without runner_scores.read', () => {
      signInAs(createUser(createRole(['projects.read'])));
      const { container } = renderSection(<GameStatsSection />);

      expect(container).toBeEmptyDOMElement();
   });

   it('should show the top list and the footer facts', () => {
      signInAs(createUser(createRole([READ_SCORES])));
      queryClient.setQueryData(TOP_KEY(), {
         data: toRuns([
            { nick: 'ACE', score: 9876, seconds: 75 },
            { nick: 'BOB', score: 500, seconds: 9, hidden: true },
         ]),
         totalCount: 1234,
      });
      queryClient.setQueryData(
         api.runnerScores.queries.all({ limit: 1, sortBy: 'createdAt', sortOrder: 'desc' })
            .queryKey,
         {
            data: [
               {
                  id: 1,
                  nick: 'ZED',
                  score: 42,
                  seconds: 60,
                  hidden: true,
                  createdAt: '2020-01-01T00:00:00.000Z',
               },
            ],
            totalCount: 1234,
         },
      );
      renderSection(<GameStatsSection />);

      expect(screen.getByText('Game')).toBeInTheDocument();
      expect(screen.getByText('1.')).toBeInTheDocument();
      expect(screen.getByText('ACE')).toBeInTheDocument();
      expect(screen.getByText('9,876')).toBeInTheDocument();
      expect(screen.getByText('1:15')).toBeInTheDocument();
      expect(screen.getByText('0:09')).toBeInTheDocument();
      expect(screen.getAllByRole('columnheader', { name: 'Time' })).toHaveLength(2);
      expect(screen.getAllByRole('columnheader', { name: 'Player' })).toHaveLength(2);
      expect(screen.getAllByRole('columnheader', { name: 'Score' })).toHaveLength(2);
      expect(screen.getAllByRole('columnheader', { name: 'Rank' })).toHaveLength(2);
      expect(screen.getByText('2.')).toBeInTheDocument();
      expect(screen.getByText('BOB')).toBeInTheDocument();
      expect(screen.getAllByText('Hidden')).toHaveLength(2);
      expect(screen.getByText('1,234')).toBeInTheDocument();
      expect(screen.getByText(/ZED · 42/)).toBeInTheDocument();
   });

   const seedTop = (players: { nick: string; score: number; seconds?: number }[]) => {
      signInAs(createUser(createRole([READ_SCORES])));
      queryClient.setQueryData(TOP_KEY(), { data: toRuns(players), totalCount: players.length });
      queryClient.setQueryData(
         api.runnerScores.queries.all({ limit: 1, sortBy: 'createdAt', sortOrder: 'desc' })
            .queryKey,
         { data: [], totalCount: players.length },
      );
   };
   const player = (i: number) => ({ nick: `P${i + 1}`, score: 1000 - i, seconds: 60 + i });

   it('should split ten players into two tables of five, the second header only for readers', () => {
      seedTop(Array.from({ length: 12 }, (_, i) => player(i)));
      renderSection(<GameStatsSection />);

      const tables = screen.getAllByRole('table');
      expect(tables).toHaveLength(2);
      const [first, second] = tables.map((table) => within(table).getAllByRole('row'));
      expect(first).toHaveLength(6);
      expect(second).toHaveLength(6);
      expect(first[1]).toHaveTextContent('1.P11:001,000');
      expect(second[5]).toHaveTextContent('10.P101:09991');
      expect(screen.queryByText('P11')).not.toBeInTheDocument();
      expect(tables[1].querySelector('thead')).toHaveClass('max-sm:sr-only');
      expect(tables[0].querySelector('thead')).not.toHaveClass('max-sm:sr-only');
   });

   it('should always show two columns of five places, the free ones dimmed and hidden on a phone', () => {
      seedTop([player(0), player(1), player(2)]);
      renderSection(<GameStatsSection />);

      const tables = screen.getAllByRole('table');
      expect(tables).toHaveLength(2);
      const [first, second] = tables.map((table) => within(table).getAllByRole('row'));
      expect(first).toHaveLength(6);
      expect(second).toHaveLength(6);
      expect(first[3]).toHaveTextContent('3.P31:02998');
      expect(first[4]).toHaveTextContent('4.–');
      expect(first[4]).toHaveClass(HIDDEN_ON_PHONE);
      expect(second[1]).toHaveTextContent('6.–');
      expect(tables[1]).toHaveClass(HIDDEN_ON_PHONE);
      expect(tables[0]).not.toHaveClass(HIDDEN_ON_PHONE);
   });

   it('should fill the right column from the sixth place', () => {
      seedTop(Array.from({ length: 7 }, (_, i) => player(i)));
      renderSection(<GameStatsSection />);

      const [first, second] = screen
         .getAllByRole('table')
         .map((t) => within(t).getAllByRole('row'));
      expect(first).toHaveLength(6);
      expect(first[5]).toHaveTextContent('5.P5');
      expect(second[1]).toHaveTextContent('6.P6');
      expect(second[2]).toHaveTextContent('7.P7');
      expect(second[3]).toHaveTextContent('8.–');
   });

   it('should keep the Time column with a dash while the API sends no seconds', () => {
      seedTop([
         { nick: 'ACE', score: 9876 },
         { nick: 'BOB', score: 500 },
      ]);
      renderSection(<GameStatsSection />);

      expect(screen.getAllByRole('columnheader', { name: 'Time' })).toHaveLength(2);
      expect(screen.getAllByRole('columnheader')).toHaveLength(8);
      const rows = screen.getAllByRole('row');
      expect(rows[1]).toHaveTextContent('1.ACE–9,876');
      expect(screen.queryByText(/NaN/)).not.toBeInTheDocument();
   });

   it('should show a dash for a run without seconds when others have it', () => {
      seedTop([player(0), { nick: 'OLD', score: 5 }]);
      renderSection(<GameStatsSection />);

      const rows = screen.getAllByRole('row');
      expect(rows[1]).toHaveTextContent('1.P11:001,000');
      expect(rows[2]).toHaveTextContent('2.OLD–5');
   });

   it('should show the empty state without scores', () => {
      signInAs(createUser(createRole([READ_SCORES])));
      queryClient.setQueryData(TOP_KEY(), { data: [], totalCount: 0 });
      queryClient.setQueryData(
         api.runnerScores.queries.all({ limit: 1, sortBy: 'createdAt', sortOrder: 'desc' })
            .queryKey,
         { data: [], totalCount: 0 },
      );
      renderSection(<GameStatsSection />);

      expect(screen.getByText('No scores yet')).toBeInTheDocument();
   });
});
