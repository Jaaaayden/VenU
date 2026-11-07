/**
 * Venue (location pin) icon — Figma asset: asset-svg-220:1914
 * Exported verbatim from the Figma design payload.
 */
import type { SvgProps } from 'react-native-svg';
import { ClipPath, Defs, FeBlend, FeColorMatrix, FeComposite, FeFlood, FeGaussianBlur, FeOffset, Filter, G, Path, Rect, Svg } from 'react-native-svg';

export function IconVenue({ width = 64, height = 32, ...props }: SvgProps) {
  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 64 32"
      fill="none"
      {...props}>
      <Defs>
        <Filter
          id="filter0_d_220_1914"
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
          <FeBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_220_1914" />
          <FeBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_220_1914" result="shape" />
        </Filter>
        <ClipPath id="clip0_220_1914">
          <Rect width="64" height="32" rx="16" fill="white" />
        </ClipPath>
      </Defs>
      <G filter="url(#filter0_d_220_1914)">
        <G clipPath="url(#clip0_220_1914)">
          <Rect width="64" height="32" rx="16" fill="#DFEBFD" />
          <Path
            d="M32 16C32.55 16 33.0208 15.8042 33.4125 15.4125C33.8042 15.0208 34 14.55 34 14C34 13.45 33.8042 12.9792 33.4125 12.5875C33.0208 12.1958 32.55 12 32 12C31.45 12 30.9792 12.1958 30.5875 12.5875C30.1958 12.9792 30 13.45 30 14C30 14.55 30.1958 15.0208 30.5875 15.4125C30.9792 15.8042 31.45 16 32 16ZM32 23.35C34.0333 21.4833 35.5417 19.7875 36.525 18.2625C37.5083 16.7375 38 15.3833 38 14.2C38 12.3833 37.4208 10.8958 36.2625 9.7375C35.1042 8.57917 33.6833 8 32 8C30.3167 8 28.8958 8.57917 27.7375 9.7375C26.5792 10.8958 26 12.3833 26 14.2C26 15.3833 26.4917 16.7375 27.475 18.2625C28.4583 19.7875 29.9667 21.4833 32 23.35ZM32 26C29.3167 23.7167 27.3125 21.5958 25.9875 19.6375C24.6625 17.6792 24 15.8667 24 14.2C24 11.7 24.8042 9.70833 26.4125 8.225C28.0208 6.74167 29.8833 6 32 6C34.1167 6 35.9792 6.74167 37.5875 8.225C39.1958 9.70833 40 11.7 40 14.2C40 15.8667 39.3375 17.6792 38.0125 19.6375C36.6875 21.5958 34.6833 23.7167 32 26Z"
            fill="#242222"
          />
        </G>
      </G>
    </Svg>
  );
}
