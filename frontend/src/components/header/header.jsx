import Logo from "@/components/logo/logo"
import Search from "@/components/search/search"
import styles from "./header.module.css"
export default function Header({ searchQuery, onSearchChange }) {
    return(
        <>
        <header className={styles.header}>
            <Logo />
            <Search searchQuery={searchQuery} onSearchChange={onSearchChange} />
        </header>
        </>
    )
}
