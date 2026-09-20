package com.example.dailycheck.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import com.example.dailycheck.data.model.GoalEntity
import com.example.dailycheck.data.model.TaskEntity

@Database(entities = [TaskEntity::class, GoalEntity::class], version = 1, exportSchema = false)
abstract class DailyCheckDatabase : RoomDatabase() {
    abstract fun taskDao(): TaskDao
    abstract fun goalDao(): GoalDao

    companion object {
        @Volatile
        private var INSTANCE: DailyCheckDatabase? = null

        fun getDatabase(context: Context): DailyCheckDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    DailyCheckDatabase::class.java,
                    "daily_check_database"
                ).fallbackToDestructiveMigration().build()
                INSTANCE = instance
                instance
            }
        }
    }
}
