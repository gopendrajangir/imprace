// in @/utils
import { NitroFilesAPI } from 'react-native-akki-ai'; // your existing FilesAPI instance
export const extractPdfText = (uri: string) =>
  NitroFilesAPI.extractPdfText(uri);
