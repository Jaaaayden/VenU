import { useEffect, useRef, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { Button } from '@/components/button';
import { FigmaIcon } from '@/components/icons/figma-icon';
import { Colors, Fonts, Radius, Shadow, Spacing, Type, WEB_COLUMN_MAX } from '@/constants/theme';
import { LANGUAGES, languageName, searchLanguages, type Language } from '@/features/profile/options';

interface LanguagePickerProps {
  languages: string[];
  main: string;
  /** `main` is '' while the primary field is cleared (validation then asks for one). */
  onChange: (languages: string[], main: string) => void;
}

/**
 * Figma "Languages you speak": a Primary and a Secondary search field, then one more field per
 * "Add another language". e.g. Primary [Español ⊗] / Secondary [English ⊗] / [⊕ Add another language]
 */
export function LanguagePicker({ languages, main, onChange }: LanguagePickerProps) {
  // Empty fields added with "Add another language" and not filled in yet.
  const [empty, setEmpty] = useState(0);

  const primary = main && languages.includes(main) ? main : null;
  const others = languages.filter(l => l !== primary);
  const rows: (string | null)[] = [primary, ...others, ...Array<null>(empty).fill(null)];
  if (rows.length < 2) rows.push(null); // Secondary is always offered

  function select(index: number, code: string) {
    if (index === 0) return onChange([code, ...others.filter(c => c !== code)], code);
    const current = rows[index];
    if (current) return onChange(languages.map(c => (c === current ? code : c)), main);
    // Filling an added field uses it up (the padding Secondary field isn't counted in `empty`).
    if (index > others.length && empty > 0) setEmpty(n => n - 1);
    onChange([...languages, code], main);
  }

  function clear(index: number) {
    const current = rows[index];
    if (!current) return setEmpty(n => Math.max(0, n - 1));
    if (index === 0) return onChange(others, '');
    onChange(languages.filter(c => c !== current), main);
  }

  return (
    <View style={styles.list}>
      {rows.map((code, i) => (
        <View key={`${i}-${code ?? 'empty'}`} style={styles.slot}>
          <Text style={styles.slotLabel}>{i === 0 ? 'Primary language' : i === 1 ? 'Secondary language' : 'Another language'}</Text>
          <LanguageMenuField
            value={code}
            fieldName={i === 0 ? 'Primary language' : i === 1 ? 'Secondary language' : 'Another language'}
            exclude={rows.filter((c): c is string => !!c && c !== code)}
            onSelect={c => select(i, c)}
            // An empty extra field can be removed; an empty Primary/Secondary has nothing to clear.
            onClear={code || i >= 2 ? () => clear(i) : undefined}
          />
        </View>
      ))}
      {rows.length < LANGUAGES.length && (
        <Button
          label="Add another language"
          variant="neutral"
          icon={<FigmaIcon name="add-circle" size={24} color={Colors.ink} />}
          onPress={() => setEmpty(n => n + 1)}
          style={styles.add}
        />
      )}
    </View>
  );
}

/** ⊗ from the Figma text field's trailing icon. */
function ClearIcon({ size = 24, color = Colors.ink }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9.25} stroke={color} strokeWidth={1.8} />
      <Path d="M8.5 8.5l7 7M15.5 8.5l-7 7" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

interface LanguageMenuFieldProps {
  value: string | null;
  /** For screen readers, e.g. "Primary language". */
  fieldName: string;
  exclude: string[];
  onSelect: (code: string) => void;
  onClear?: () => void;
}

/**
 * Figma "Menu with Text field": a filled field (🔍 Search Languages / value / ⊗). Tapping it turns
 * it into a search box with a menu of matches underneath; picking one closes it.
 */
export function LanguageMenuField({ value, fieldName, exclude, onSelect, onClear }: LanguageMenuFieldProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const results = searchLanguages(query).filter(l => !exclude.includes(l.code)).slice(0, 6);

  useEffect(() => () => { if (blurTimer.current) clearTimeout(blurTimer.current); }, []);

  function close() {
    if (blurTimer.current) clearTimeout(blurTimer.current);
    setOpen(false);
    setQuery('');
  }

  function pick(code: string) {
    close();
    onSelect(code);
  }

  return (
    <View>
      <View style={[styles.field, open && styles.fieldOpen]}>
        <View style={styles.lead}>
          <FigmaIcon name="leading-icon-de9321" size={44} color={Colors.ink} />
        </View>
        {open ? (
          <View style={styles.content}>
            <Text style={styles.label}>Search languages</Text>
            <TextInput
              style={styles.input}
              value={query}
              onChangeText={setQuery}
              placeholder={value ? languageName(value) : 'e.g. Español, Korean, ASL'}
              placeholderTextColor={Colors.textFaint}
              autoFocus
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={() => (results[0] ? pick(results[0].code) : close())}
              // Let a tap on a menu item land before the menu closes (web blurs on mousedown).
              onBlur={() => { blurTimer.current = setTimeout(close, 200); }}
              accessibilityLabel={`Search languages for ${fieldName}`}
            />
          </View>
        ) : (
          <Pressable
            style={styles.content}
            onPress={() => setOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={`${fieldName}: ${value ? languageName(value) : 'none'}`}
            accessibilityHint="Opens a language search">
            <Text style={styles.label}>Search Languages</Text>
            <Text style={[styles.value, !value && styles.placeholder]} numberOfLines={1}>
              {value ? languageName(value) : 'Choose a language'}
            </Text>
          </Pressable>
        )}
        {open || onClear ? (
          <Pressable
            onPress={open ? close : onClear}
            style={styles.trail}
            accessibilityRole="button"
            accessibilityLabel={open ? 'Close language search' : value ? `Remove ${languageName(value)}` : `Remove this language field`}>
            <ClearIcon />
          </Pressable>
        ) : (
          <View style={styles.trailSpacer} />
        )}
      </View>
      {open && (
        <View style={styles.menu} accessibilityRole="menu">
          {results.length === 0 ? (
            <Text style={styles.empty}>No match. Try the English name.</Text>
          ) : (
            results.map(l => (
              <Pressable
                key={l.code}
                onPress={() => pick(l.code)}
                style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
                accessibilityRole="menuitem"
                accessibilityLabel={`${l.native}, ${l.english}`}>
                <Text style={[styles.menuNative, styles.ltr]}>{l.native}</Text>
                {l.native !== l.english && <Text style={[styles.menuEnglish, styles.ltr]}>{l.english}</Text>}
              </Pressable>
            ))
          )}
        </View>
      )}
    </View>
  );
}

interface LanguageSearchModalProps {
  visible: boolean;
  /** Sheet heading; defaults to "Add a language". */
  title?: string;
  exclude?: string[];
  onSelect: (code: string) => void;
  onClose: () => void;
}

/** Full-screen searchable list; names shown in their own script with the English name underneath. */
export function LanguageSearchModal({ visible, title = 'Add a language', exclude = [], onSelect, onClose }: LanguageSearchModalProps) {
  const [query, setQuery] = useState('');
  const results = searchLanguages(query).filter(l => !exclude.includes(l.code));

  function close() {
    setQuery('');
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={close} presentationStyle="pageSheet">
      <SafeAreaView style={styles.modal}>
        <View style={styles.modalBody}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle} accessibilityRole="header">{title}</Text>
            <Pressable onPress={close} style={styles.doneTarget} accessibilityRole="button">
              <Text style={styles.done}>Done</Text>
            </Pressable>
          </View>
          <View style={styles.searchBox}>
            <FigmaIcon name="leading-icon-de9321" size={40} color={Colors.ink} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search, e.g. Español, Korean, ASL"
              placeholderTextColor={Colors.textFaint}
              value={query}
              onChangeText={setQuery}
              autoFocus
              autoCorrect={false}
              accessibilityLabel="Search languages"
            />
          </View>
          <FlatList<Language>
            data={results}
            keyExtractor={l => l.code}
            keyboardShouldPersistTaps="handled"
            ItemSeparatorComponent={() => <View style={styles.sep} />}
            ListEmptyComponent={<Text style={styles.empty}>No match. Try the English name.</Text>}
            renderItem={({ item }) => (
              <Pressable
                style={({ pressed }) => [styles.item, pressed && styles.menuItemPressed]}
                onPress={() => {
                  setQuery('');
                  onSelect(item.code);
                }}
                accessibilityRole="button"
                accessibilityLabel={`${item.native}, ${item.english}`}>
                <Text style={[styles.menuNative, styles.ltr]}>{item.native}</Text>
                {item.native !== item.english && <Text style={[styles.menuEnglish, styles.ltr]}>{item.english}</Text>}
              </Pressable>
            )}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  list: { gap: Spacing.lg },
  slot: { gap: 6 },
  slotLabel: { fontFamily: Fonts.text, fontSize: 13, lineHeight: 16, color: Colors.text, paddingLeft: Spacing.xs },
  add: { marginHorizontal: Spacing.xl, marginTop: Spacing.sm },

  // Figma: #F5F5F5 fill, radius 10, 45 tall; 56 here for two readable lines.
  field: { flexDirection: 'row', alignItems: 'center', minHeight: 56, borderRadius: Radius.md, backgroundColor: Colors.surfaceAlt },
  fieldOpen: { borderBottomLeftRadius: 4, borderBottomRightRadius: 4, borderBottomWidth: 3, borderBottomColor: Colors.ink },
  lead: { width: 52, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, minHeight: 52, justifyContent: 'center', paddingVertical: 4 },
  label: { fontFamily: Fonts.text, fontSize: 13, lineHeight: 16, color: Colors.textMuted },
  value: { fontFamily: Fonts.display, fontSize: 16, lineHeight: 22, color: Colors.text, writingDirection: 'ltr', textAlign: 'left' },
  placeholder: { color: Colors.textFaint },
  input: { fontFamily: Fonts.display, fontSize: 16, lineHeight: 22, color: Colors.text, paddingVertical: 0, outlineStyle: 'none' } as object,
  trail: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', marginRight: 4 },
  trailSpacer: { width: 52 },

  menu: { marginTop: 2, paddingVertical: Spacing.sm, borderRadius: 4, backgroundColor: Colors.surfaceAlt, ...Shadow.card },
  menuItem: { minHeight: 44, paddingHorizontal: Spacing.lg, paddingVertical: 6, justifyContent: 'center' },
  menuItemPressed: { backgroundColor: Colors.primarySoft },
  menuNative: { fontFamily: Fonts.display, fontSize: 15, lineHeight: 20, color: Colors.text },
  menuEnglish: { ...Type.caption },
  // Arabic, Persian, Hebrew names: keep each word's script direction but line the rows up on the left
  // (RN web otherwise auto-detects RTL and pushes them to the right edge).
  ltr: { writingDirection: 'ltr', textAlign: 'left' },
  empty: { ...Type.caption, textAlign: 'center', paddingVertical: Spacing.md },

  modal: { flex: 1, backgroundColor: Colors.bg, paddingHorizontal: Spacing.gutter },
  // Phone-width column even on a desktop browser, same as the app on web.
  modalBody: { flex: 1, width: '100%', maxWidth: WEB_COLUMN_MAX, alignSelf: 'center' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.md },
  modalTitle: { fontFamily: Fonts.display, fontSize: 22, lineHeight: 28, color: Colors.text },
  doneTarget: { minHeight: 44, minWidth: 44, alignItems: 'flex-end', justifyContent: 'center' },
  done: { ...Type.bodyStrong, color: Colors.primary },
  searchBox: { flexDirection: 'row', alignItems: 'center', minHeight: 52, borderRadius: Radius.md, backgroundColor: Colors.surfaceAlt, paddingLeft: 4, marginBottom: Spacing.md },
  searchInput: { ...Type.input, flex: 1, paddingVertical: 12, paddingRight: Spacing.lg, outlineStyle: 'none' } as object,
  item: { minHeight: 52, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.xs, gap: 2, justifyContent: 'center' },
  sep: { height: 1, backgroundColor: Colors.divider },
});
