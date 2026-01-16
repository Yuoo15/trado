"use client";
import { useState } from "react";
import Header from "@/components/header/header"
import Banners from "@/pages/home/banners/banners"
import Categories from "./categories/categories_main"
import Goods from "./goods/goods"
import { categories } from "@/db/cat"
import styles from "./home.module.css"


export default function Home(props){
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState(null);
    
    const selectedCategoryName = selectedCategory !== null 
        ? categories.find(c => c.id === selectedCategory)?.name 
        : null;
    
    return(
        <>
            <div className={styles.home}>
            <Header searchQuery={searchQuery} onSearchChange={setSearchQuery} />
            <Banners />
            <Categories selectedCategory={selectedCategory} onCategoryClick={setSelectedCategory} />
            
            {/* Индикатор активной фильтрации */}
            {(selectedCategory !== null || searchQuery.trim()) && (
                <div className={styles.filterIndicator}>
                    <div className={styles.filterBadges}>
                        {selectedCategoryName && (
                            <div className={styles.filterBadge}>
                                <span className={styles.filterIcon}>🏷️</span>
                                <span className={styles.filterLabel}>Категория:</span>
                                <span className={styles.filterValue}>{selectedCategoryName}</span>
                                <button 
                                    className={styles.filterRemove}
                                    onClick={() => setSelectedCategory(null)}
                                    aria-label="Убрать фильтр категории"
                                >
                                    ✕
                                </button>
                            </div>
                        )}
                        {searchQuery.trim() && (
                            <div className={styles.filterBadge}>
                                <span className={styles.filterIcon}>🔍</span>
                                <span className={styles.filterLabel}>Поиск:</span>
                                <span className={styles.filterValue}>"{searchQuery}"</span>
                                <button 
                                    className={styles.filterRemove}
                                    onClick={() => setSearchQuery("")}
                                    aria-label="Очистить поиск"
                                >
                                    ✕
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
            
            <Goods searchQuery={searchQuery} selectedCategory={selectedCategory} />
            </div>
        </>
    )
}