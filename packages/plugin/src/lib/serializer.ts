import {
  stringifyAsync as stringifyD,
  parse as parseD,
  BlobPlugin,
  FilePlugin,
  RequestPlugin,
  ResponsePlugin,
  URLPlugin,
  AsyncIterablePlugin,
  CustomEventPlugin,
  DOMExceptionPlugin,
  DataViewPlugin,
  ErrorPlugin,
  EventPlugin,
  FormDataPlugin,
  HeadersPlugin,
  ImageDataPlugin,
  IterablePlugin,
  ReadableStreamPlugin,
  URLSearchParamsPlugin,
  SymbolPlugin,
} from 'devaluex'

const plugins = [
  BlobPlugin,
  FilePlugin,
  RequestPlugin,
  ResponsePlugin,
  URLPlugin,
  AsyncIterablePlugin,
  CustomEventPlugin,
  DOMExceptionPlugin,
  DataViewPlugin,
  ErrorPlugin,
  EventPlugin,
  FormDataPlugin,
  HeadersPlugin,
  ImageDataPlugin,
  IterablePlugin,
  ReadableStreamPlugin,
  URLSearchParamsPlugin,
  SymbolPlugin,
]

export async function stringifyAsync(value: any): Promise<string> {
  return stringifyD(value, { plugins })
}

export function parse(str: string): any {
  return parseD(str, { plugins })
}

Reflect.set(globalThis, 'stringifyAsync', stringifyAsync)
Reflect.set(globalThis, 'parse', parse)
