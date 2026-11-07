/**
 * Profile icon — Figma asset: asset-svg-220:1922
 * Exported verbatim from the Figma design payload.
 */
import type { SvgProps } from 'react-native-svg';
import { ClipPath, Defs, FeBlend, FeColorMatrix, FeComposite, FeFlood, FeGaussianBlur, FeOffset, Filter, G, Path, Rect, Svg } from 'react-native-svg';

export function IconProfile({ width = 64, height = 32, ...props }: SvgProps) {
  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 64 32"
      fill="none"
      {...props}>
      <Defs>
        <Filter
          id="filter0_d_220_1922"
          x="-5"
          y="-3"
          width="74"
          height="42"
          filterUnits="userSpaceOnUse">
          <FeFlood floodOpacity="0" result="BackgroundImageFix" />
          <FeColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <FeOffset dy="2" />
          <FeGaussianBlur stdDeviation="2.5" />
          <FeComposite in2="hardAlpha" operator="out" />
          <FeColorMatrix
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"
          />
          <FeBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_220_1922" />
          <FeBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_220_1922" result="shape" />
        </Filter>
        <ClipPath id="clip0_220_1922">
          <Rect width="64" height="32" rx="16" fill="white" />
        </ClipPath>
      </Defs>
      <G filter="url(#filter0_d_220_1922)">
        <G clipPath="url(#clip0_220_1922)">
          <Path
            d="M25.85 21.1C26.7 20.45 27.65 19.9375 28.7 19.5625C29.75 19.1875 30.85 19 32 19C33.15 19 34.25 19.1875 35.3 19.5625C36.35 19.9375 37.3 20.45 38.15 21.1C38.7333 20.4167 39.1875 19.6417 39.5125 18.775C39.8375 17.9083 40 16.9833 40 16C40 13.7833 39.2208 11.8958 37.6625 10.3375C36.1042 8.77917 34.2167 8 32 8C29.7833 8 27.8958 8.77917 26.3375 10.3375C24.7792 11.8958 24 13.7833 24 16C24 16.9833 24.1625 17.9083 24.4875 18.775C24.8125 19.6417 25.2667 20.4167 25.85 21.1ZM32 17C31.0167 17 30.1875 16.6625 29.5125 15.9875C28.8375 15.3125 28.5 14.4833 28.5 13.5C28.5 12.5167 28.8375 11.6875 29.5125 11.0125C30.1875 10.3375 31.0167 10 32 10C32.9833 10 33.8125 10.3375 34.4875 11.0125C35.1625 11.6875 35.5 12.5167 35.5 13.5C35.5 14.4833 35.1625 15.3125 34.4875 15.9875C33.8125 16.6625 32.9833 17 32 17ZM32 26C30.6167 26 29.3167 25.7375 28.1 25.2125C26.8833 24.6875 25.825 23.975 24.925 23.075C24.025 22.175 23.3125 21.1167 22.7875 19.9C22.2625 18.6833 22 17.3833 22 16C22 14.6167 22.2625 13.3167 22.7875 12.1C23.3125 10.8833 24.025 9.825 24.925 8.925C25.825 8.025 26.8833 7.3125 28.1 6.7875C29.3167 6.2625 30.6167 6 32 6C33.3833 6 34.6833 6.2625 35.9 6.7875C37.1167 7.3125 38.175 8.025 39.075 8.925C39.975 9.825 40.6875 10.8833 41.2125 12.1C41.7375 13.3167 42 14.6167 42 16C42 17.3833 41.7375 18.6833 41.2125 19.9C40.6875 21.1167 39.975 22.175 39.075 23.075C38.175 23.975 37.1167 24.6875 35.9 25.2125C34.6833 25.7375 33.3833 26 32 26Z"
            fill="#242222"
          />
        </G>
      </G>
    </Svg>
  );
}
