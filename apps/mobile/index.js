import 'react-native-get-random-values';
import { TextEncoder, TextDecoder } from 'text-encoding';
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
}
if (typeof global.TextDecoder === 'undefined' || global.TextDecoder.name !== 'TextDecoder') {
  global.TextDecoder = TextDecoder;
}
import { registerRootComponent } from 'expo';
import App from './src/App';

registerRootComponent(App);
