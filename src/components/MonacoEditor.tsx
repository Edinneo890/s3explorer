import { onMount, onCleanup, createEffect } from 'solid-js';
import * as monaco from 'monaco-editor';

export function langFromExt(ext: string): string {
  const e = ext.toLowerCase();
  const map: Record<string, string> = {
    js: 'javascript', mjs: 'javascript', cjs: 'javascript', jsx: 'javascript',
    ts: 'typescript', tsx: 'typescript',
    json: 'json', jsonl: 'json',
    html: 'html', htm: 'html',
    css: 'css', scss: 'css', less: 'less',
    py: 'python', go: 'go', rs: 'rust',
    c: 'c', cpp: 'cpp', cc: 'cpp', h: 'cpp', hpp: 'cpp',
    java: 'java', kt: 'kotlin', swift: 'swift',
    rb: 'ruby', php: 'php', lua: 'lua', r: 'r', perl: 'perl',
    sql: 'sql', graphql: 'graphql',
    sh: 'shell', bash: 'shell', zsh: 'shell', fish: 'shell',
    yaml: 'yaml', yml: 'yaml',
    toml: 'ini', ini: 'ini', cfg: 'ini', conf: 'ini',
    xml: 'xml', svg: 'xml',
    md: 'markdown', mdx: 'markdown',
    dockerfile: 'dockerfile', makefile: 'makefile',
    csv: 'plaintext', txt: 'plaintext', log: 'plaintext',
    env: 'plaintext', gitignore: 'plaintext',
  };
  return map[e] ?? 'plaintext';
}

let themeRegistered = false;

function ensureTheme() {
  if (themeRegistered) return;
  themeRegistered = true;

  monaco.editor.defineTheme('md3-dark', {
    base: 'vs-dark',
    inherit: false,
    rules: [
      { token: '',                      foreground: 'E6E1E5', background: '141218' },

      { token: 'comment',               foreground: '7A7285', fontStyle: 'italic' },

      { token: 'keyword',               foreground: 'D0BCFF' },
      { token: 'keyword.operator',      foreground: '938F99' },
      { token: 'storage',               foreground: 'D0BCFF' },
      { token: 'storage.type',          foreground: 'D0BCFF' },
      { token: 'storage.modifier',      foreground: 'CCC2DC' },

      { token: 'type',                  foreground: 'EADDFF' },
      { token: 'type.identifier',       foreground: 'EADDFF' },

      { token: 'entity.name.function',  foreground: 'B3A3E0' },
      { token: 'entity.name.type',      foreground: 'EADDFF' },
      { token: 'entity.name.class',     foreground: 'EADDFF' },
      { token: 'entity.name.tag',       foreground: 'D0BCFF' },
      { token: 'entity.other.attribute-name', foreground: 'CCC2DC' },

      { token: 'string',                foreground: '6DD58C' },
      { token: 'string.key.json',       foreground: 'B3A3E0' },
      { token: 'string.escape',         foreground: 'A3D9B3' },
      { token: 'string.template',       foreground: '6DD58C' },
      { token: 'regexp',                foreground: 'F28B82' },

      { token: 'number',                foreground: 'CCC2DC' },
      { token: 'constant.numeric',      foreground: 'CCC2DC' },
      { token: 'constant.language',     foreground: 'EADDFF' },
      { token: 'constant',              foreground: 'EADDFF' },

      { token: 'variable',              foreground: 'E6E1E5' },
      { token: 'variable.language',     foreground: 'D0BCFF', fontStyle: 'italic' },
      { token: 'variable.parameter',    foreground: 'CAC4D0', fontStyle: 'italic' },

      { token: 'identifier',            foreground: 'E6E1E5' },
      { token: 'support.function',      foreground: 'B3A3E0' },
      { token: 'support.class',         foreground: 'EADDFF' },
      { token: 'support.type',          foreground: 'EADDFF' },

      { token: 'delimiter',             foreground: '938F99' },
      { token: 'delimiter.bracket',     foreground: '938F99' },
      { token: 'delimiter.curly',       foreground: '938F99' },
      { token: 'delimiter.parenthesis', foreground: '938F99' },
      { token: 'delimiter.square',      foreground: '938F99' },
      { token: 'punctuation',           foreground: '938F99' },

      { token: 'tag',                   foreground: 'D0BCFF' },
      { token: 'tag.attribute.name',    foreground: 'CCC2DC' },
      { token: 'tag.attribute.value',   foreground: '6DD58C' },
      { token: 'metatag',               foreground: '938F99' },
      { token: 'metatag.content.html',  foreground: '6DD58C' },

      { token: 'attribute.name',        foreground: 'CCC2DC' },
      { token: 'attribute.value',       foreground: '6DD58C' },
      { token: 'attribute.value.number',foreground: 'CCC2DC' },
      { token: 'attribute.value.unit',  foreground: 'D0BCFF' },
      { token: 'attribute.value.hex',   foreground: '6DD58C' },

      { token: 'markup.heading',        foreground: 'D0BCFF', fontStyle: 'bold' },
      { token: 'markup.bold',           foreground: 'EADDFF', fontStyle: 'bold' },
      { token: 'markup.italic',         foreground: 'CAC4D0', fontStyle: 'italic' },
      { token: 'markup.underline.link', foreground: '6DD58C' },
      { token: 'markup.inline.raw',     foreground: 'B3A3E0' },

      { token: 'annotation',            foreground: 'B3A3E0' },
      { token: 'namespace',             foreground: 'EADDFF' },

      { token: 'invalid',               foreground: 'F2B8B5', fontStyle: 'underline' },
      { token: 'invalid.deprecated',    foreground: 'F2B8B5', fontStyle: 'italic underline' },
    ],
    colors: {
      'editor.background':                     '#141218',
      'editor.foreground':                     '#E6E1E5',

      'editorLineNumber.foreground':           '#49454F',
      'editorLineNumber.activeForeground':     '#938F99',
      'editorGutter.background':               '#141218',

      'editor.lineHighlightBackground':        '#1D1B20',
      'editor.lineHighlightBorder':            '#00000000',

      'editor.selectionBackground':            '#4F378B80',
      'editor.inactiveSelectionBackground':    '#4A445840',
      'editor.selectionForeground':            '#EADDFF',
      'editor.selectionHighlightBackground':   '#4A445830',

      'editorCursor.foreground':               '#D0BCFF',
      'editorCursor.background':               '#141218',

      'editorWhitespace.foreground':           '#49454F50',
      'editorIndentGuide.background1':         '#49454F40',
      'editorIndentGuide.activeBackground1':   '#938F9970',

      'editor.findMatchBackground':            '#4F378B90',
      'editor.findMatchBorder':                '#D0BCFF60',
      'editor.findMatchHighlightBackground':   '#4A445850',
      'editor.findRangeHighlightBackground':   '#4A445820',

      'editorBracketMatch.background':         '#4F378B50',
      'editorBracketMatch.border':             '#D0BCFF70',

      'editorBracketHighlight.foreground1':    '#D0BCFF',
      'editorBracketHighlight.foreground2':    '#EADDFF',
      'editorBracketHighlight.foreground3':    '#CCC2DC',
      'editorBracketHighlight.foreground4':    '#B3A3E0',
      'editorBracketHighlight.foreground5':    '#9D8CD0',
      'editorBracketHighlight.foreground6':    '#8775C0',
      'editorBracketHighlight.unexpectedBracket.foreground': '#F2B8B5',

      'editorError.foreground':                '#F2B8B5',
      'editorWarning.foreground':              '#FFB75E',
      'editorInfo.foreground':                 '#D0BCFF',
      'editorHint.foreground':                 '#6DD58C',

      'editorWidget.background':               '#211F26',
      'editorWidget.border':                   '#49454F',
      'editorWidget.foreground':               '#E6E1E5',
      'editorWidget.resizeBorder':             '#D0BCFF',

      'editorSuggestWidget.background':        '#211F26',
      'editorSuggestWidget.border':            '#49454F',
      'editorSuggestWidget.foreground':        '#E6E1E5',
      'editorSuggestWidget.selectedBackground':'#4F378B',
      'editorSuggestWidget.selectedForeground':'#EADDFF',
      'editorSuggestWidget.highlightForeground':'#D0BCFF',
      'editorSuggestWidget.focusHighlightForeground': '#D0BCFF',

      'editorHoverWidget.background':          '#211F26',
      'editorHoverWidget.border':              '#49454F',
      'editorHoverWidget.foreground':          '#E6E1E5',

      'editor.wordHighlightBackground':        '#4A445840',
      'editor.wordHighlightBorder':            '#4A445840',
      'editor.wordHighlightStrongBackground':  '#4F378B50',
      'editor.wordHighlightStrongBorder':      '#4F378B60',

      'list.hoverBackground':                  '#2B2930',
      'list.activeSelectionBackground':        '#4F378B',
      'list.activeSelectionForeground':        '#EADDFF',
      'list.inactiveSelectionBackground':      '#4A4458',
      'list.inactiveSelectionForeground':      '#E8DEF8',
      'list.focusBackground':                  '#4F378B50',
      'list.focusForeground':                  '#EADDFF',
      'list.highlightForeground':              '#D0BCFF',
      'list.dropBackground':                   '#4F378B40',

      'scrollbar.shadow':                      '#00000000',
      'scrollbarSlider.background':            '#49454F60',
      'scrollbarSlider.hoverBackground':       '#938F9980',
      'scrollbarSlider.activeBackground':      '#938F99',

      'editorOverviewRuler.background':        '#141218',
      'editorOverviewRuler.border':            '#00000000',
      'editorOverviewRuler.findMatchForeground':'#D0BCFF80',
      'editorOverviewRuler.errorForeground':   '#F2B8B580',
      'editorOverviewRuler.warningForeground': '#FFB75E80',
      'editorOverviewRuler.infoForeground':    '#D0BCFF60',

      'minimap.background':                    '#141218',
      'minimap.selectionHighlight':            '#4F378B',
      'minimap.errorHighlight':                '#F2B8B5',
      'minimap.warningHighlight':              '#FFB75E',

      'input.background':                      '#211F26',
      'input.border':                          '#49454F',
      'input.foreground':                      '#E6E1E5',
      'input.placeholderForeground':           '#938F99',
      'inputOption.activeBackground':          '#4F378B',
      'inputOption.activeForeground':          '#EADDFF',
      'inputOption.activeBorder':              '#D0BCFF',

      'dropdown.background':                   '#211F26',
      'dropdown.border':                       '#49454F',
      'dropdown.foreground':                   '#E6E1E5',
      'dropdown.listBackground':               '#211F26',

      'button.background':                     '#4F378B',
      'button.foreground':                     '#EADDFF',
      'button.hoverBackground':                '#5D4598',

      'focusBorder':                           '#D0BCFF',
      'contrastBorder':                        '#00000000',
      'widget.shadow':                         '#00000050',

      'peekView.border':                       '#4F378B',
      'peekViewEditor.background':             '#1D1B20',
      'peekViewEditor.matchHighlightBackground':'#4F378B50',
      'peekViewResult.background':             '#211F26',
      'peekViewResult.selectionBackground':    '#4F378B',
      'peekViewResult.selectionForeground':    '#EADDFF',
      'peekViewResult.matchHighlightBackground':'#4F378B50',
      'peekViewTitle.background':              '#2B2930',
      'peekViewTitleDescription.foreground':   '#CAC4D0',
      'peekViewTitleLabel.foreground':         '#E6E1E5',
    },
  });
}

interface MonacoEditorProps {
  value: string;
  language: string;
  readOnly?: boolean;
  onValueChange?: (v: string) => void;
  onSave?: () => void;
}

export function MonacoEditor(props: MonacoEditorProps) {
  let container!: HTMLDivElement;
  let editor: monaco.editor.IStandaloneCodeEditor | undefined;
  let ignoreNextChange = false;

  onMount(() => {
    ensureTheme();

    editor = monaco.editor.create(container, {
      value: props.value,
      language: props.language,
      theme: 'md3-dark',
      readOnly: props.readOnly ?? false,
      minimap: { enabled: false },
      fontSize: 13,
      fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Consolas', monospace",
      fontLigatures: true,
      lineNumbers: 'on',
      lineNumbersMinChars: 3,
      glyphMargin: false,
      folding: true,
      foldingHighlight: false,
      scrollBeyondLastLine: false,
      wordWrap: 'off',
      automaticLayout: true,
      tabSize: 2,
      insertSpaces: true,
      renderLineHighlight: 'gutter',
      smoothScrolling: true,
      cursorBlinking: 'smooth',
      cursorSmoothCaretAnimation: 'on',
      padding: { top: 10, bottom: 10 },
      scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
      overviewRulerLanes: 0,
      hideCursorInOverviewRuler: true,
      bracketPairColorization: { enabled: true },
      occurrencesHighlight: 'off',
      selectionHighlight: true,
      links: true,
      contextmenu: true,
    });

    editor.onDidChangeModelContent(() => {
      if (!ignoreNextChange) {
        props.onValueChange?.(editor!.getValue());
      }
    });

    if (props.onSave) {
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        props.onSave!();
      });
    }
  });

  createEffect(() => {
    const lang = props.language;
    if (editor) {
      const model = editor.getModel();
      if (model && model.getLanguageId() !== lang) {
        monaco.editor.setModelLanguage(model, lang);
      }
    }
  });

  createEffect(() => {
    editor?.updateOptions({ readOnly: props.readOnly ?? false });
  });

  createEffect(() => {
    const newVal = props.value;
    if (editor && editor.getValue() !== newVal) {
      ignoreNextChange = true;
      const pos = editor.getPosition();
      editor.setValue(newVal);
      if (pos) editor.setPosition(pos);
      ignoreNextChange = false;
    }
  });

  onCleanup(() => editor?.dispose());

  return <div ref={container!} style={{ width: '100%', height: '100%' }} />;
}

