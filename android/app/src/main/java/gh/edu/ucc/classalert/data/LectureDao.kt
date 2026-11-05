package gh.edu.ucc.classalert.data

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.Query

@Dao
interface LectureDao {
    @Query("SELECT * FROM lectures ORDER BY day, time")
    suspend fun all(): List<Lecture>

    @Insert
    suspend fun insert(lecture: Lecture): Long

    @Delete
    suspend fun delete(lecture: Lecture)
}
