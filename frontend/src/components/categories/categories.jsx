"use client";
import React from "react"
import styles from './categories.module.css'

export default function Categories({ categories = [], selectedCategory = null, onCategoryClick = null }){
    const handleClick = (categoryId) => {
        if (onCategoryClick) {
            // Если кликнули на уже выбранную категорию - снимаем выбор
            if (selectedCategory === categoryId) {
                onCategoryClick(null);
            } else {
                onCategoryClick(categoryId);
            }
        }
    };

    return(
        <>
        <div className={styles.wrap}>
          <div className={styles.list}>
            {categories.map((c) => {
                const isSelected = selectedCategory === c.id;
                return (
                    <div 
                        key={c.id} 
                        className={`${styles.item} ${isSelected ? styles.selected : ''}`}
                        onClick={() => handleClick(c.id)}
                    >
                        <div className={`${styles.categories} ${isSelected ? styles.categoriesSelected : ''}`}>
                            {c.emoji && (
                                <span className={styles.emoji}>{c.emoji}</span>
                            )}
                        </div>
                        <p className={styles.name}>{c.name}</p>
                    </div>
                );
            })}
          </div>
        </div>
        </>
    )
}
