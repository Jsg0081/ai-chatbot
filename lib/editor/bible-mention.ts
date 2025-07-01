import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import Suggestion, { SuggestionOptions } from '@tiptap/suggestion';
import { BibleMentionComponent } from '@/components/editor/bible-mention-component';
import { PluginKey } from '@tiptap/pm/state';

export interface BibleMentionOptions {
  HTMLAttributes: Record<string, any>;
  renderLabel: (props: { options: BibleMentionOptions; node: any }) => string;
  suggestion: Omit<SuggestionOptions, 'editor'>;
}

const BibleMentionPluginKey = new PluginKey('bibleMention');

export const BibleMention = Node.create<BibleMentionOptions>({
  name: 'bibleMention',

  addOptions() {
    return {
      HTMLAttributes: {},
      renderLabel({ node }: { options: BibleMentionOptions; node: any }) {
        return node.attrs.label ?? node.attrs.id;
      },
      suggestion: {
        char: '@',
        pluginKey: BibleMentionPluginKey,
        allowSpaces: true,
        allowedPrefixes: null,
        startOfLine: false,
        command: ({ editor, range, props }: any) => {
          const nodeAfter = editor.view.state.selection.$to.nodeAfter;
          const overrideSpace = nodeAfter?.text?.startsWith(' ');

          if (overrideSpace) {
            range.to += 1;
          }

          editor
            .chain()
            .focus()
            .insertContentAt(range, [
              {
                type: 'bibleMention',
                attrs: props,
              },
              {
                type: 'text',
                text: ' ',
              },
            ])
            .run();

          window.getSelection()?.collapseToEnd();
        },
        allow: ({ state, range }: any) => {
          const $from = state.doc.resolve(range.from);
          const type = state.schema.nodes[this.name];
          const allow = !!$from.parent.type.contentMatch.matchType(type);

          return allow;
        },
      },
    };
  },

  group: 'inline',

  inline: true,

  selectable: false,

  atom: true,

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-id'),
        renderHTML: (attributes: Record<string, any>) => {
          if (!attributes.id) {
            return {};
          }

          return {
            'data-id': attributes.id,
          };
        },
      },

      label: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-label'),
        renderHTML: (attributes: Record<string, any>) => {
          if (!attributes.label) {
            return {};
          }

          return {
            'data-label': attributes.label,
          };
        },
      },

      reference: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-reference'),
        renderHTML: (attributes: Record<string, any>) => {
          if (!attributes.reference) {
            return {};
          }

          return {
            'data-reference': attributes.reference,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: `span[data-type="${this.name}"]`,
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(
        { 'data-type': this.name },
        this.options.HTMLAttributes,
        HTMLAttributes
      ),
      this.options.renderLabel({
        options: this.options,
        node,
      }),
    ];
  },

  renderText({ node }) {
    return this.options.renderLabel({
      options: this.options,
      node,
    });
  },

  addNodeView() {
    return ReactNodeViewRenderer(BibleMentionComponent);
  },

  addKeyboardShortcuts() {
    return {
      Backspace: () =>
        this.editor.commands.command(({ tr, state }: any) => {
          let isMention = false;
          const { selection } = state;
          const { empty, anchor } = selection;

          if (!empty) {
            return false;
          }

          state.doc.nodesBetween(anchor - 1, anchor, (node: any, pos: number) => {
            if (node.type.name === this.name) {
              isMention = true;
              tr.insertText(
                this.options.suggestion.char || '',
                pos,
                pos + node.nodeSize
              );

              return false;
            }
          });

          return isMention;
        }),
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      } as SuggestionOptions),
    ];
  },
}); 