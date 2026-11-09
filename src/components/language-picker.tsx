import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Chip } from '@/components/chip';
import { Colors, Radius, Spacing, Type } from '@/constants/theme';
import { languageName, searchLanguages, type Language } from '@/features/profile/options';

interface LanguagePickerProps {
  languages: string[];
  main: string;
  onChange: (languages: string[], main: string) => void;
}

/**
 * Selected languages as chips: tap one to make it main, × to remove, "+ Add a language" to search.
 * e.g. [✓ Español · main ×] [English ×] [+ Add a language]
 */
export function LanguagePicker({ languages, main, onChange }: LanguagePickerProps) {
  const [open, setOpen] = useState(false);

  function remove(code: string) {
    const next = languages.filter(l => l !== code);
    onChange(next, code === main ? (next[0] ?? '') : main);
  }

  function add(code: string) {
    setOpen(false);
    if (!languages.includes(code)) onChange([...languages, code], main || code);
  }

  return (
    <View style={styles.row}>
      {languages.map(code => (
        <Chip
          key={code}
          label={code === main ? `${languageName(code)} · main` : languageName(code)}
          selected={code === main}
          role="radio"
          onPress={() => onChange(languages, code)}
          onRemove={() => remove(code)}
          removeLabel={`Remove ${languageName(code)}`}
        />
      ))}
      <Chip label="+ Add a language" dashed role="button" onPress={() => setOpen(true)} />
      <LanguageSearchModal visible={open} exclude={languages} onSelect={add} onClose={() => setOpen(false)} />
    </View>
  );
}

interface LanguageSearchModalProps {
  visible: boolean;
  exclude?: string[];
  onSelect: (code: string) => void;
  onClose: () => void;
}

/** Full-screen searchable list; names shown in their own script with the English name underneath. */
export function LanguageSearchModal({ visible, exclude = [], onSelect, onClose }: LanguageSearchModalProps) {
  const [query, setQuery] = useState('');
  const results = searchLanguages(query).filter(l => !exclude.includes(l.code));

  function close() {
    setQuery('');
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={close} presentationStyle="pageSheet">
      <SafeAreaView style={styles.modal}>
        <View style={styles.modalHeader}>
          <Text style={Type.heading} accessibilityRole="header">Add a language</Text>
          <Pressable onPress={close} hitSlop={10} accessibilityRole="button">
            <Text style={styles.done}>Done</Text>
          </Pressable>
        </View>
        <TextInput
          style={styles.search}
          placeholder="Search, e.g. Español, Korean, ASL"
          placeholderTextColor={Colors.textFaint}
          value={query}
          onChangeText={setQuery}
          autoFocus
          autoCorrect={false}
          accessibilityLabel="Search languages"
        />
        <FlatList<Language>
          data={results}
          keyExtractor={l => l.code}
          keyboardShouldPersistTaps="handled"
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          ListEmptyComponent={<Text style={styles.empty}>No match. Try the English name.</Text>}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
              onPress={() => {
                setQuery('');
                onSelect(item.code);
              }}
              accessibilityRole="button"
              accessibilityLabel={`${item.native}, ${item.english}`}>
              <Text style={Type.bodyStrong}>{item.native}</Text>
              {item.native !== item.english && <Text style={Type.caption}>{item.english}</Text>}
            </Pressable>
          )}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },

  modal: { flex: 1, backgroundColor: Colors.bg, paddingHorizontal: Spacing.gutter },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.lg },
  done: { ...Type.bodyStrong, color: Colors.primary },
  search: {
    ...Type.body,
    height: 48,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  item: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.xs, gap: 2 },
  itemPressed: { backgroundColor: Colors.primarySoft },
  sep: { height: 1, backgroundColor: Colors.divider },
  empty: { ...Type.caption, textAlign: 'center', marginTop: Spacing.xl },
});
