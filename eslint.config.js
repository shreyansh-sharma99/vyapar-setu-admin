import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  {
    // Soft UI guard rails (docs/plans/soft-ui-redesign-plan.md). "error" since batch U7.
    files: ['src/pages/**/*.{js,jsx}', 'src/components/**/*.{js,jsx}'],
    ignores: [
      // The component library itself is where raw elements and colours live.
      'src/components/ui/**',
      // Light / dark logo swap.
      'src/components/Logo.jsx',
      // Printed / PDF output keeps its own fixed look.
      'src/pages/Invoices/invoiceLayout/components/InvoiceTemplates.jsx',
      'src/pages/Invoices/invoiceLayout/components/InvoiceTemplateRenderer.jsx',
      'src/pages/sales/salesInvoices/invoiceLayoutPdf.jsx',
      'src/pages/**/receiptPdf.jsx',
      'src/pages/**/ReceiptPrint.jsx',
    ],
    rules: {
      'no-restricted-imports': ['error', {
        paths: [{ name: 'antd', message: 'Use the themed wrappers from @/components/ui instead of importing antd.' }],
      }],
      'no-restricted-syntax': ['error',
        {
          selector: 'JSXOpeningElement[name.name=/^(button|input|select|textarea|table)$/]',
          message: 'Use the matching component from @/components/ui (Button, Input, Select, Textarea, DataTable) instead of a raw element.',
        },
        {
          selector: 'JSXAttribute[name.name="className"] Literal[value=/(bg|text|border|ring|from|via|to|divide|fill|stroke|outline|accent|caret|decoration|placeholder)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-[0-9]{2,3}|#[0-9a-fA-F]{6}|(^| )dark:|--vs-/]',
          message: 'Use Soft UI token classes (bg-brand, text-ink, border-line, text-danger …) instead of fixed colours, dark: classes or --vs-* vars.',
        },
        {
          selector: 'JSXAttribute[name.name="className"] TemplateElement[value.raw=/(bg|text|border|ring|from|via|to|divide|fill|stroke|outline|accent|caret|decoration|placeholder)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-[0-9]{2,3}|#[0-9a-fA-F]{6}|(^| )dark:|--vs-/]',
          message: 'Use Soft UI token classes (bg-brand, text-ink, border-line, text-danger …) instead of fixed colours, dark: classes or --vs-* vars.',
        },
      ],
    },
  },
])
