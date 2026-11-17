import { Platform, type ViewStyle } from 'react-native';

/**
 * Lays a block out left to right whatever the page direction, e.g. English policy points on an
 * Arabic page: <View style={LTR_STYLE} {...LTR_WEB}>. Web takes the `dir` attribute (react-native-web
 * forwards it and rejects the `direction` style); native takes the style.
 */
export const LTR_WEB = Platform.OS === 'web' ? ({ dir: 'ltr' } as object) : {};
export const LTR_STYLE: ViewStyle = Platform.select({ web: {}, default: { direction: 'ltr' } });
