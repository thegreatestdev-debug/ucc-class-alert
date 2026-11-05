package gh.edu.ucc.classalert.data

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "lectures")
data class Lecture(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val course: String,
    val day: Int,
    val time: String,
    val room: String,
    val leadMinutes: Int = 15
)
