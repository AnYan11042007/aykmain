/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import BattlePassPortal from './BattlePassPortal';
import { User } from '../types';

interface BattlePassProps {
  uid: string;
  user: User | null;
  onShowResult: (title: string, message: string, isWin: boolean) => void;
}

export default function BattlePass({ uid, user, onShowResult }: BattlePassProps) {
  return <BattlePassPortal uid={uid} user={user} onShowResult={onShowResult} />;
}

export { BattlePassPortal };
