// Chat translation: each reader sees incoming messages in their own language.
//   translate({ text, target, source? })      one-off, e.g. translate({ text: 'Hola', target: 'en' })
//   useMessageTranslation(message, 'es')      what a chat bubble shows, plus "Try again"
//   useReaderLanguage()                       the profile's chat language, else the UI language
//   chatLanguage(['ase', 'es']) → 'es'        the language a person reads and writes chat in
export { chatLanguage, profileChatLanguage } from './languages';
export { isRealProvider, translate, translationCache, useTranslationProvider } from './service';
export { useMessageTranslation, useReaderLanguage, type MessageTranslation } from './use-translation';
