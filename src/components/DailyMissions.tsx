/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import DailyMissionsPortal from './DailyMissionsPortal';
import { User } from '../types';

interface DailyMissionsProps {
  uid: string;
  user: User | null;
  onShowResult: (title: string, message: string, isWin: boolean) => void;
}

export default function DailyMissions({ uid, user, onShowResult }: DailyMissionsProps) {
  return <DailyMissionsPortal uid={uid} user={user} onShowResult={onShowResult} />;
}

export { DailyMissionsPortal };
