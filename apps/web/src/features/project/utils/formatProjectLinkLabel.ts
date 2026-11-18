type ProjectLinkLabelSource = {
   label: string | null;
   url: string;
};

export function formatProjectLinkLabel({ label, url }: ProjectLinkLabelSource): string {
   if (label) return label;

   try {
      return new URL(url).hostname.replace(/^www\./, '');
   } catch {
      return url;
   }
}
