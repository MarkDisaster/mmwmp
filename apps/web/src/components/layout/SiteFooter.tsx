import LogoMarkSvg from '@/assets/icons/logo-mark.svg';

export function SiteFooter() {
   return (
      <div
         aria-hidden
         className="mt-auto flex w-full justify-center pt-10 pb-13.75 peer-has-[[data-no-footer]]:hidden"
      >
         <LogoMarkSvg className="h-5 w-auto text-brand" />
      </div>
   );
}
