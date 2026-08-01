// Format Date With Timing 
export const formatDateWithTiming = (dateString) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    }).format(date);
};

// Format Date With WithoutTiming
export const formatDate = (dateString) => {
    if (!dateString) return "—";
    const date = new Date(dateString.endsWith("Z") ? dateString : dateString + "Z");
    if (isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(date);
};
