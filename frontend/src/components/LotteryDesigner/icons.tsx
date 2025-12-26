import {
    SparklesIcon,
    StarIcon,
    HeartIcon,
    BellIcon,
    SunIcon,
    CurrencyDollarIcon,
    TrophyIcon,
    ArchiveBoxIcon,
    CloudIcon,
    QuestionMarkCircleIcon,
    // UI Icons
    PencilSquareIcon, // for Basic Tab
    Squares2X2Icon, // for Layout Tab
    PaintBrushIcon, // for Theme Tab
    PuzzlePieceIcon, // for Symbols Tab
    SparklesIcon as EffectsIcon, // reuse for Effects Tab
    ArrowPathIcon, // for Reset/Refresh
    AdjustmentsHorizontalIcon, // for customize
    FaceSmileIcon, // generic
    SpeakerWaveIcon,
    PlayCircleIcon,
    GiftIcon,
    LightBulbIcon,
    CheckIcon,
} from '@heroicons/react/24/solid';

import React from 'react';

// Fallback for diamond until we have a better one or simple shape
const DiamondIcon = (props: any) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M12 2L2 12l10 10 10-10L12 2z" />
    </svg>
);

export const ICON_MAP: Record<string, React.ElementType> = {
    SparklesIcon,
    StarIcon,
    HeartIcon,
    BellIcon,
    SunIcon,
    CurrencyDollarIcon,
    TrophyIcon,
    ArchiveBoxIcon,
    CloudIcon,
    QuestionMarkCircleIcon,
    DiamondIcon,
};

export const UI_ICONS = {
    Basic: PencilSquareIcon,
    Layout: Squares2X2Icon,
    Theme: PaintBrushIcon,
    Symbols: PuzzlePieceIcon,
    Effects: EffectsIcon,
    Reset: ArrowPathIcon,
    Customize: AdjustmentsHorizontalIcon,
    Game: FaceSmileIcon,
    Sound: SpeakerWaveIcon,
    Auto: PlayCircleIcon,
    Confetti: GiftIcon,
    Glow: LightBulbIcon,
    Check: CheckIcon,
};
