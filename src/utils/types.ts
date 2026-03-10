export type PlaceholderValues = { [key: string]: string };

export type TMakeStylesInline = (
  templatePath: string,
  placeholderValues?: PlaceholderValues,
) => Promise<string>;

export type TMakeStylesInlineFromString = (
  templateString: string,
  data?: PlaceholderValues,
) => Promise<string>;
