
// Light and dark variants swap with the `dark` class on <html>.
export function Logo({ className = '' }) {
    return (
        <>
            <img src="/image/logos/ecnbiz-logo.svg" alt="ecnbiz" className={`${className} dark:hidden`} />
            <img src="/image/logos/ecnbiz-logo-dark.svg" alt="ecnbiz" className={`${className} hidden dark:block`} />
        </>
    );
}

export default Logo;
