// Chat translation: each reader sees incoming messages in their own language.
//   translate({ text, target, source? })      one-off, e.g. translate({ text: 'Hola', target: 'en' })
//   useMessageTranslation(message, 'es')      what a chat bubble shows
//   useReaderLanguage()                       the profile's main language, else the UI language
export { translate, translationCache } from './service';
export { readingLanguage, useMessageTranslation, useReaderLanguage, type MessageTranslation } from './use-translation';
