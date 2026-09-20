package com.example.dailycheck

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import com.example.dailycheck.ui.DailyCheckApp
import com.example.dailycheck.ui.DailyCheckViewModel

class MainActivity : ComponentActivity() {
    private val viewModel: DailyCheckViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            DailyCheckApp(viewModel = viewModel)
        }
    }
}
