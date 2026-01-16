"use client";
import styles from './search.module.css'

export default function Search({ searchQuery, onSearchChange }) {
    const handleChange = (e) => {
        if (onSearchChange) {
            onSearchChange(e.target.value);
        }
    };

    return(
        <>
            <form onSubmit={(e) => e.preventDefault()} className={styles.searchForm}>
                <div className={styles.searchWrapper}>
                    <input 
                        type="text" 
                        placeholder="Поиск" 
                        className={styles.searchInput}
                        value={searchQuery || ""}
                        onChange={handleChange}
                    />
                    <svg 
                        className={styles.searchIcon} 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                    >
                        <path
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </div>
            </form>
        </>
    )
}