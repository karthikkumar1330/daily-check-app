package com.example.dailycheck

import android.app.Application
import com.example.dailycheck.data.local.DailyCheckDatabase

class DailyCheckApplication : Application() {
    val database: DailyCheckDatabase by lazy { DailyCheckDatabase.getDatabase(this) }

    override fun onCreate() {
        super.onCreate()
    }
}
