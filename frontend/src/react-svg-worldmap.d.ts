declare module 'react-svg-worldmap' {
  import * as React from 'react';

  export interface WorldMapProps {
    color?: string;
    backgroundColor?: string;
    title?: string;
    valueSuffix?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | 'responsive';
    data: Array<{ country: string; value: number | string }>;
    onClickFunction?: (
      event: React.MouseEvent<SVGPathElement, MouseEvent>,
      countryCode: string,
      countryValue: any
    ) => void;
  }

  export const WorldMap: React.FC<WorldMapProps>;
}
