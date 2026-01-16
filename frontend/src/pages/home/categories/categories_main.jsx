"use client";
import Categories from "@/components/categories/categories"
import { categories } from "@/db/cat"
import styles from "./categories_main.module.css"

export default function CategoriesMain({ selectedCategory, onCategoryClick }){
    return(
        <>
        <h3 className={styles.title}>Категории</h3>
        <Categories 
            categories={categories} 
            selectedCategory={selectedCategory}
            onCategoryClick={onCategoryClick}
        />
        </>
    )
}