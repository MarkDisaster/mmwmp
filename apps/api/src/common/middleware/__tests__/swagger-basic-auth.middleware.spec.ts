import type { NextFunction, Request, Response } from 'express';

import { createSwaggerBasicAuth } from '../swagger-basic-auth.middleware';

const USER = 'docs-reader';
const PASSWORD = 'correct-horse-battery';

const basic = (value: string) => `Basic ${Buffer.from(value).toString('base64')}`;

const run = (authorization?: string, credentials = { username: USER, password: PASSWORD }) => {
   const res = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      end: jest.fn(),
   };
   const next = jest.fn();
   createSwaggerBasicAuth(credentials)(
      { headers: { authorization } } as unknown as Request,
      res as unknown as Response,
      next as NextFunction,
   );
   return { res, next };
};

const expectChallenge = ({ res, next }: ReturnType<typeof run>) => {
   expect(next).not.toHaveBeenCalled();
   expect(res.status).toHaveBeenCalledWith(401);
   expect(res.setHeader).toHaveBeenCalledWith(
      'WWW-Authenticate',
      'Basic realm="API docs", charset="UTF-8"',
   );
   expect(res.end).toHaveBeenCalledWith();
};

describe('createSwaggerBasicAuth', () => {
   it('calls next() for the right credentials', () => {
      const { res, next } = run(basic(`${USER}:${PASSWORD}`));
      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
   });

   it('accepts the scheme in any case', () => {
      expect(
         run(`basic ${Buffer.from(`${USER}:${PASSWORD}`).toString('base64')}`).next,
      ).toHaveBeenCalled();
      expect(
         run(`BASIC ${Buffer.from(`${USER}:${PASSWORD}`).toString('base64')}`).next,
      ).toHaveBeenCalled();
   });

   it('accepts a password with colons', () => {
      const password = 'pass:with:colons:1234';
      const { next } = run(basic(`${USER}:${password}`), { username: USER, password });
      expect(next).toHaveBeenCalled();
   });

   it('accepts non-ASCII credentials as UTF-8', () => {
      const password = 'hesloěščřžýáíé1234';
      expect(
         run(basic(`${USER}:${password}`), { username: USER, password }).next,
      ).toHaveBeenCalled();
   });

   it('answers 401 without a header', () => {
      expectChallenge(run());
   });

   it('answers 401 for another scheme', () => {
      expectChallenge(run(`Bearer ${Buffer.from(`${USER}:${PASSWORD}`).toString('base64')}`));
   });

   it('answers 401 for malformed base64', () => {
      expectChallenge(run('Basic !!!not-base64!!!'));
      expectChallenge(run('Basic '));
   });

   it('answers 401 when the decoded value has no colon', () => {
      expectChallenge(run(basic(USER)));
   });

   it('answers 401 for a wrong user', () => {
      expectChallenge(run(basic(`someone:${PASSWORD}`)));
   });

   it('answers 401 for a wrong password', () => {
      expectChallenge(run(basic(`${USER}:wrong-password-here`)));
   });

   it('answers 401 for a password that only starts like the right one', () => {
      expectChallenge(run(basic(`${USER}:${PASSWORD}x`)));
      expectChallenge(run(basic(`${USER}:${PASSWORD.slice(0, -1)}`)));
   });

   it('answers 401 for a very long header without decoding it', () => {
      expectChallenge(run(basic(`${USER}:${'a'.repeat(100_000)}`)));
   });

   it('rejects by length even when the long credentials are the right ones', () => {
      const long = 'p'.repeat(2000);
      expect(
         run(basic(`${USER}:${long}`), { username: USER, password: long }).next,
      ).not.toHaveBeenCalled();
      expectChallenge(run(basic(`${USER}:${long}`), { username: USER, password: long }));
   });
});
